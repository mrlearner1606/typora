# Typora

A browser-based, Typora-style Markdown editor. What you type is what you see: the
document is rendered inline while you edit, and saved back out as plain Markdown.

- WYSIWYG editing via [Milkdown](https://milkdown.dev/) Crepe (ProseMirror + CodeMirror)
- Open `.md` files, save back to `.md` with `Ctrl/Cmd + S`, open with `Ctrl/Cmd + O`
- Local draft autosave and a light/dark theme that follows the shipped Crepe themes
- Static build, published to GitHub Pages

## Develop

```bash
pnpm install
pnpm dev        # opens http://localhost:5173/dev.html
```

The Vite source entry is `dev.html`. The root `index.html` and `assets/` are
**generated build output** (see Deployment) — don't edit them by hand.

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Round-trip behaviour of the Markdown helpers is covered by fixtures in
`tests/roundtrip`.

## Deployment

`pnpm build` runs Vite and then `scripts/publish-pages.mjs`, which emits both
layouts GitHub Pages can serve from this repository:

| Pages configuration | What is served |
| --- | --- |
| **GitHub Actions** (`build_type: workflow`) | `dist/`, uploaded by `.github/workflows/pages.yml` |
| **Deploy from a branch** → `main` / `(root)` | repo-root `index.html` + `assets/`, committed by the build |

Both are kept in sync, so the site works either way. The workflow skips its
deploy steps cleanly when the repository is still on the branch deployment
instead of failing.

Vite `base` is `./`, so relative asset URLs work from both
`https://<user>.github.io/<repo>/` and a user/organisation page.

To use the Actions deployment, set **Settings → Pages → Build and deployment →
Source: GitHub Actions**; the next push to `main` will deploy through the
workflow.

## Notes on the reverse-engineering work

`RE-NOTES.md` records the static analysis of the desktop Typora build (Electron
fuses, `app.asar` layout, the V8 bytecode main process, and the renderer stack)
that informed this editor's structure.
