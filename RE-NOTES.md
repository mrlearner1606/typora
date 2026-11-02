# Typora 1.14.9 — reverse-engineering notes (REA / rea-agents 6.8.0)

Target: official Linux x64 build, `https://download.typora.io/linux/Typora-linux-x64.tar.gz`
(144 MB, Electron **42.2.0**, Chromium/V8 bundled, `releaseId be82b3a0`).
Unpacked at `/tmp/typora-re` (ephemeral — re-download to reproduce).

Scope: architecture / file-format / interoperability analysis of a copy you own.
Typora is commercial software — nothing here touches activation or licensing checks.

## What REA answered (no GUI, no patching)

### 1. Electron fuse state — `inspect-electron-fuses`

```
rea inspect-electron-fuses .../resources/../Typora --json
```

ELF, x86_64, 210,091,224 bytes, sha256 `3d3804b5…a8ff`, one fuse wire at offset **30533168**.

| # | Fuse | State | Consequence |
|---|------|-------|-------------|
| 0 | RunAsNode | disabled | `ELECTRON_RUN_AS_NODE` ignored |
| 1 | EnableCookieEncryption | disabled | |
| 2 | EnableNodeOptionsEnvironmentVariable | **enabled** | `NODE_OPTIONS` **is honored** in main process |
| 3 | EnableNodeCliInspectArguments | **disabled** | CLI `--inspect` / `--remote-debugging-port` ignored |
| 4 | EnableEmbeddedAsarIntegrityValidation | disabled | (not enforced on Linux anyway) |
| 5 | OnlyLoadAppFromAsar | **enabled** | app must load from `app.asar`; unpacked-dir loading blocked |
| 6 | LoadBrowserProcessSpecificV8Snapshot | disabled | |
| 7 | GrantFileProtocolExtraPrivileges | enabled | `file://` gets extra privileges |
| 8 | WasmTrapHandlers | enabled | V8 version pin for bytecode |

Two consequences drive everything else:
- Playwright/`capture-electron-scenario` **cannot attach** (fuse 3) without repacking.
- `NODE_OPTIONS` **can** preload a hook into the main process (fuse 2), which is the
  cheapest instrumentation route.

### 2. Static graph — `analyze-javascript-application app.asar`

Reads cleanly but finds almost nothing (2 relevant files, 1 parsed JS, 0 IPC ops)
because the real main process is **`atom.compiled.dist.jsc`** — 380 KB of V8
**bytecode**, not text. `app.asar` is 390 KB total.

## Layout (all under `resources/`)

| Artifact | Size | Contents |
|---|---|---|
| `app.asar` | 390 KB | `package.json` (main: `launch.dist.js`), `launch.dist.js` loader, `atom.compiled.dist.jsc` (main process, bytecode) |
| `lib.asar` | 8.3 MB | bootstrap.css, CodeMirror modes, mermaid (+zenuml), MathJax4, jimp, pdf-lib/pdf-designer, aws-sdk, `image-worker.js` |
| `node_modules.asar` | 15.1 MB | chokidar, adm-zip, electron-dl, extract-zip, fs-extra/fs-plus, cld, spellchecker |
| `window.html` | 91 KB | main editor window shell |
| `html/content.html`, `html/preview.html` | — | contenteditable surface + preview |
| `appsrc/window/frame.js` | **1.71 MB** | renderer editor bundle — *plain, readable minified JS* |
| `appsrc/editor/EmojiSearchMap.js`, `appsrc/finder-worker.js` | — | emoji data, file-finder worker |
| `page-dist/` | — | separate React app: welcome / license / preferences / local settings, no sourcemaps |
| `Docs/*.md` | — | shipped user docs (Markdown Reference, Custom Themes, Code Fences…) |
| `conf.default.json` → `conf/conf.user.json` | — | user config incl. `flags`, `keyBinding`, `searchService` |

Native addons: `node_modules/main.node`, `cld.node`, `spellchecker/.../cld.node`, `fswin.node` (Windows only).

## The `.jsc` loader (deobfuscated by reading `launch.dist.js`)

`launch.dist.js` is 4 KB of readable loader code. Behavior:

1. `v8.setFlagsFromString("--no-lazy")` + `("--no-flush-bytecode")` — determinism.
2. Registers `Module._extensions[".jsc"]` / `[".cjsc"]`.
3. Builds a dummy `vm.Script("", {produceCachedData:true})` and copies its **flag-hash
   header bytes 12..16** over the file's header (V8 version+flag compatibility stamp).
4. Reads bytes 8..12 as a **source-length** field and synthesizes an empty source string
   padded with zero-width spaces to that length (`"​".repeat(n-2)`).
5. `new vm.Script(source, { cachedData: fileBytes })` then `runInThisContext()`.
6. Invokes the module function as
   `(exports, require, module, __filename, __dirname, process, global)`.

Meaning: the shipped file is compiled bytecode with **no source and no source map**, so
there is no decompiler path to original TypeScript. Treat main-process logic as
behavioral-only: hook boundaries (fs, ipcMain, net, `BrowserWindow`) rather than reading it.
Bytecode is also pinned to Electron 42's V8, so it will not load under another runtime.

## Runtime surface seen in the bytecode string table

- Switches the app itself applies: `--inspect`, `--remote-debugging-port`, `appendSwitch`,
  `disable-gpu`; config read from `/conf/conf.default.json` and **`/conf/conf.user.json`**.
- DevTools plumbing: `openDevTools`, `closeDevTools`, `isDevToolsOpened`,
  `ClientCommand.toggleDevTools()`, `Toggle DevTools`, `inspectElement`.
- App commands: `getApplicationMenu`, `addNewMarkdown`, `writeFileSync`, `getRecentFolders`,
  `Recent Locations`, `setAppUserModelId("abnerworks.Typora")`, Windows-only `REG IMPORT`,
  `explorer.exe`, `native-reg`.
- Renderer IPC strings observed: `addBackup`, `license.show`, `getPath`, `export`,
  `execForAll`, `ondragstart`.

## Renderer API (readable, best target for feature questions)

`appsrc/window/frame.js` exposes scriptable globals used by the app's own menu handlers:

- `window.ClientCommand.*` — `save`, `saveAs`, `copy`, `copyAsMarkdown`, `copyAsHTMLSource`,
  `copyAsSemanticHTML`, `copyAsPlainText`, `paste`, `pasteAsPlain`, `cut`, `undo`, `redo`,
  `selectAll`, `zoomIn/zoomOut/resetZoom`, `setToolbarVisible`, `openFileLocation`,
  `doImport`, `execForAll`, `refreshViewMenu`.
- `window.File.*` — file/open/save plumbing (referenced 29×).

### 3. Renderer stack (grep counts in `frame.js`)

| Token | Hits | Reading |
|---|---|---|
| `CodeMirror` | 182 | editor core is CodeMirror-based |
| `contenteditable` | 144 | WYSIWYG layer over the CM model |
| `MathJax` | 72 | math rendering (MathJax4 shipped in `lib.asar`) |
| `mermaid` | 60 | diagrams (shipped in `lib.asar`) |
| `marked` | 47 | Markdown → HTML parsing |
| `execCommand` | 45 | legacy editing commands still in use |
| `pandoc` | 34 | Pandoc-backed export path |
| `katex` / `showDown` | 2 / 1 | legacy or fallback references |

So the pipeline to study is: CodeMirror model → `marked` for HTML/preview → MathJax +
Mermaid renderers → `execCommand`/`contenteditable` for live editing → Pandoc for export.
`window.html` carries 21 `<script>` tags (MathJax, pdf-lib/pdf-designer, `appsrc/window/frame.js`).

## Recommended next steps

1. **Renderer questions** (editor behavior, Markdown/HTML pipeline, copy-as-* semantics):
   grep/format `appsrc/window/frame.js` — it is the whole editor, plain JS.
2. **Runtime inspection without repacking** (untested here: no display in this container):
   add `--remote-debugging-port=9222` via the documented `flags` array in
   `~/.config/Typora/conf/conf.user.json`, e.g.
   `{"flags": [["remote-debugging-port", "9222"]]}`, launch with a virtual display, then
   `rea list-electron-targets http://127.0.0.1:9222 --json` and
   `rea inspect-electron-page http://127.0.0.1:9222 <TARGET_ID> --include-script-sources`.
   This bypasses fuse 3 because the switch comes from application code, not argv.
3. **Main-process hooking via fuse 2**: `NODE_OPTIONS="--require /abs/hook.cjs"`.
   The preload runs before `launch.dist.js`, so it can wrap `Module._extensions[".jsc"]`,
   `ipcMain.handle/on`, `BrowserWindow`, `app`, `fs`, and `net` — this is the practical way
   to enumerate the real IPC channel list that static analysis cannot see.
   (REA deliberately strips `NODE_OPTIONS` in its own capture, so do this manually.)
4. **Files/formats**: Typora's `.md` output, custom themes and `conf.user.json` are public,
   documented surface — start from `Docs/Custom Themes.md` and `Docs/Markdown Reference.md`
   before reverse-engineering anything.
