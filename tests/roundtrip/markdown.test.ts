import { describe, expect, it } from 'vitest'
import {
  countCharacters,
  countWords,
  ensureTrailingNewline,
  sanitizeFilename,
  titleFromMarkdown,
} from '../../src/lib/markdown'

/**
 * Round-trip fixtures: saving a document must be a fixed point after the first
 * normalisation, so opening and saving an untouched file never rewrites it.
 */
const fixture = [
  '# Title\n\nA paragraph with **bold** text.\n',
  '# Title\n\nA paragraph with **bold** text.',
  '# Title\n\nA paragraph with **bold** text.\n\n\n\n',
  'line with trailing spaces   \nsecond line\t\n',
  '```ts\nconst a = 1\n```\n',
  '',
]

describe('ensureTrailingNewline', () => {
  it.each(fixture)('normalises %j to a single trailing newline', (input) => {
    const once = ensureTrailingNewline(input)
    if (input.trim().length === 0) {
      expect(once).toBe('')
      return
    }
    expect(once.endsWith('\n')).toBe(true)
    expect(once.trimEnd()).not.toMatch(/\n$/)
  })

  it.each(fixture)('is idempotent for %j', (input) => {
    const once = ensureTrailingNewline(input)
    expect(ensureTrailingNewline(once)).toBe(once)
  })
})

describe('titleFromMarkdown', () => {
  it('uses the first heading', () => {
    expect(titleFromMarkdown('# Hello world\n\ntext')).toBe('Hello world')
  })

  it('strips inline markup and links', () => {
    expect(titleFromMarkdown('## **Bold** [link](https://example.com)')).toBe('Bold link')
  })

  it('falls back when there is no heading', () => {
    expect(titleFromMarkdown('just text')).toBe('Untitled')
    expect(titleFromMarkdown('just text', 'Document')).toBe('Document')
  })
})

describe('sanitizeFilename', () => {
  it('replaces characters that are invalid in file names', () => {
    expect(sanitizeFilename('a/b:c*d?e"f<g>h|i')).toBe('a-b-c-d-e-f-g-h-i.md')
  })

  it('keeps an existing .md extension', () => {
    expect(sanitizeFilename('notes.md')).toBe('notes.md')
  })

  it('falls back for blank titles', () => {
    expect(sanitizeFilename('   ')).toBe('untitled.md')
  })
})

describe('countWords / countCharacters', () => {
  it('ignores markup, HTML and fenced code', () => {
    // Heading + "three words here" — the fenced block contributes no words.
    const source = '# Heading\n\n**three** words here\n\n```js\nconst x = 1\n```\n'
    expect(countWords(source)).toBe(4)
  })

  it('skips HTML tags without dropping surrounding words', () => {
    expect(countWords('<p>one</p> two')).toBe(2)
  })

  it('counts characters as authored', () => {
    expect(countCharacters('# abc')).toBe(5)
  })
})
