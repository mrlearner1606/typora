export type Theme = 'light' | 'dark'

const DRAFT_KEY = 'typora.draft.v1'
const THEME_KEY = 'typora.theme.v1'

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** The local draft is document text only — never credentials or tokens. */
export function loadDraft(): string | null {
  return storage()?.getItem(DRAFT_KEY) ?? null
}

export function saveDraft(markdown: string): void {
  storage()?.setItem(DRAFT_KEY, markdown)
}

export function clearDraft(): void {
  storage()?.removeItem(DRAFT_KEY)
}

export function loadTheme(): Theme {
  return storage()?.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

export function saveTheme(theme: Theme): void {
  storage()?.setItem(THEME_KEY, theme)
}
