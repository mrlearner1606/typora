const FENCED_CODE = /```[\s\S]*?```|~~~[\s\S]*?~~~/g
const HTML_TAG = /<[^>]+>/g
const MARKDOWN_SYNTAX = /[#>*_`~[\]()!|\\-]/g
const ATX_HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/m

/** Words as a reader would count them: markup, HTML tags and fenced code are ignored. */
export function countWords(markdown: string): number {
  const plain = markdown
    .replace(FENCED_CODE, ' ')
    .replace(HTML_TAG, ' ')
    .replace(MARKDOWN_SYNTAX, ' ')
  return plain.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length
}

export function countCharacters(markdown: string): number {
  return markdown.length
}

/** First ATX heading in the document, used as the document title and default file name. */
export function titleFromMarkdown(markdown: string, fallback = 'Untitled'): string {
  const match = markdown.match(ATX_HEADING)
  if (!match) return fallback
  const title = match[1]
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim()
  return title.length > 0 ? title : fallback
}

const INVALID_FILENAME_CHARS = new Set(['\\', '/', ':', '*', '?', '"', '<', '>', '|'])

function isInvalidFilenameChar(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0
  return codePoint < 0x20 || INVALID_FILENAME_CHARS.has(character)
}

/** Filesystem-safe `.md` name derived from a document title. */
export function sanitizeFilename(title: string): string {
  const replaced = Array.from(title, (character) =>
    isInvalidFilenameChar(character) ? '-' : character,
  ).join('')
  const cleaned = replaced
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 80)
    .trim()
  const base = cleaned.length > 0 ? cleaned : 'untitled'
  return /\.md$/i.test(base) ? base : `${base}.md`
}

/**
 * Markdown round-trip normalisation: trailing whitespace is dropped and the file
 * ends with exactly one newline, so saving a loaded document does not churn it.
 */
export function ensureTrailingNewline(markdown: string): string {
  const trimmed = markdown.replace(/[ \t]+$/gm, '').trimEnd()
  return trimmed.length > 0 ? `${trimmed}\n` : ''
}
