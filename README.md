# Typora

A browser-based, Typora-style Markdown editor. What you type is what you see: the
document is rendered inline while you edit, and saved back out as plain Markdown.

- WYSIWYG editing via [Milkdown](https://milkdown.dev/) Crepe (ProseMirror + CodeMirror)
- Open `.md` files, save back to `.md` with `Ctrl/Cmd + S`, open with `Ctrl/Cmd + O`
- Local draft autosave and a light/dark theme that follows the shipped Crepe themes
- Static build, deployed by GitHub Actions to GitHub Pages

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Round-trip behaviour of the Markdown helpers is covered by fixtures in
`tests/roundtrip`.

## Deploy

`.github/workflows/pages.yml` runs the checks, builds `dist/` and publishes it to
GitHub Pages on every push to `main`. Enable **Settings → Pages → Build and
deployment → GitHub Actions** once in the repository.

The Vite `base` is `./`, so the site works from both
`https://<user>.github.io/<repo>/` and a user/organisation page.

## Notes on the reverse-engineering work

`RE-NOTES.md` records the static analysis of the desktop Typora build (Electron
fuses, `app.asar` layout, the V8 bytecode main process, and the renderer stack)
that informed this editor's structure.
