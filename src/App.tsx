import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Editor, type EditorHandle } from './components/Editor'
import {
  countCharacters,
  countWords,
  ensureTrailingNewline,
  sanitizeFilename,
  titleFromMarkdown,
} from './lib/markdown'
import { clearDraft, loadDraft, loadTheme, saveDraft, saveTheme, type Theme } from './lib/storage'

const SAMPLE = `# Welcome

This is a Typora-style editor: what you type *is* what you see.

## Markdown, live

- **Bold**, *italic* and \`inline code\`
- ~~Strikethrough~~ and [links](https://example.com)
- Task lists, tables and math are supported

> Open a file, edit it, then save it back as Markdown.

\`\`\`ts
const greet = (name: string) => \`Hello, \${name}\`
\`\`\`

Press **Ctrl/Cmd + S** to save, **Ctrl/Cmd + O** to open.
`

const AUTOSAVE_DELAY_MS = 600

function initialDocument(): string {
  return loadDraft() ?? SAMPLE
}

export default function App() {
  const [markdown, setMarkdown] = useState(initialDocument)
  const [docKey, setDocKey] = useState(0)
  const [filename, setFilename] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [status, setStatus] = useState('Draft restored')

  const editorRef = useRef<EditorHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback((next: string) => {
    setMarkdown(next)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    saveTheme(theme)
  }, [theme])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveDraft(ensureTrailingNewline(markdown))
      setStatus(`Draft saved ${new Date().toLocaleTimeString()}`)
    }, AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [markdown])

  const saveFile = useCallback(() => {
    const current = ensureTrailingNewline(editorRef.current?.getMarkdown() ?? markdown)
    const stem = filename?.replace(/\.(md|markdown|txt)$/i, '') ?? titleFromMarkdown(current)
    const name = sanitizeFilename(stem)

    const url = URL.createObjectURL(new Blob([current], { type: 'text/markdown;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = name
    link.click()
    URL.revokeObjectURL(url)

    setFilename(name)
    setStatus(`Saved ${name}`)
  }, [filename, markdown])

  const openFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const onFileSelected = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const text = await file.text()
    setMarkdown(text)
    setFilename(file.name)
    setDocKey((key) => key + 1)
    setStatus(`Opened ${file.name}`)
  }, [])

  const newDocument = useCallback(() => {
    const hasContent = markdown.trim().length > 0
    if (hasContent && !window.confirm('Discard the current document and start a new one?')) return

    clearDraft()
    setMarkdown('# Untitled\n\n')
    setFilename(null)
    setDocKey((key) => key + 1)
    setStatus('New document')
  }, [markdown])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey
      if (!modifier) return
      if (event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveFile()
      }
      if (event.key.toLowerCase() === 'o') {
        event.preventDefault()
        openFile()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openFile, saveFile])

  const title = filename?.replace(/\.(md|markdown|txt)$/i, '') ?? titleFromMarkdown(markdown)

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__identity">
          <span className="topbar__mark" aria-hidden="true">
            T
          </span>
          <div className="topbar__titles">
            <h1 className="topbar__title">{title}</h1>
            <p className="topbar__subtitle">{filename ?? 'Local draft'}</p>
          </div>
        </div>

        <div className="topbar__actions">
          <button type="button" className="button" onClick={newDocument}>
            New
          </button>
          <button type="button" className="button" onClick={openFile}>
            Open
          </button>
          <button type="button" className="button button--primary" onClick={saveFile}>
            Save .md
          </button>
          <button
            type="button"
            className="button button--icon"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <main className="document">
        <Editor key={docKey} ref={editorRef} initialValue={markdown} onChange={handleChange} />
      </main>

      <footer className="statusbar">
        <span>{status}</span>
        <span className="statusbar__metrics">
          {countWords(markdown)} words · {countCharacters(markdown)} characters
        </span>
      </footer>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="visually-hidden"
        onChange={onFileSelected}
      />
    </div>
  )
}
