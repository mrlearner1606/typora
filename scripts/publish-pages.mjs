import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Produces the two layouts GitHub Pages can serve from this repo:
 *
 * 1. `dist/index.html` — the artifact used when Pages is configured with
 *    "Build and deployment → GitHub Actions".
 * 2. repo-root `index.html` + `assets/` — what the legacy "Deploy from a
 *    branch → main / (root)" deployment serves directly.
 *
 * Keeping both in sync means the site works whichever of the two the
 * repository is configured for.
 */
const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')
const builtEntry = resolve(dist, 'dev.html')

if (!existsSync(builtEntry)) {
  throw new Error('dist/dev.html is missing — run `vite build` before publishing')
}

const html = readFileSync(builtEntry, 'utf8')

writeFileSync(resolve(dist, 'index.html'), html)
rmSync(builtEntry)

writeFileSync(resolve(root, 'index.html'), html)
rmSync(resolve(root, 'assets'), { recursive: true, force: true })
cpSync(resolve(dist, 'assets'), resolve(root, 'assets'), { recursive: true })

// Skip Jekyll processing on the legacy deployment path.
writeFileSync(resolve(root, '.nojekyll'), '')

console.log('Published dist/index.html and repo-root index.html + assets/')
