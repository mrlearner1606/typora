import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react'
import { Crepe } from '@milkdown/crepe'
import '@milkdown/crepe/theme/common/style.css'
import '@milkdown/crepe/theme/frame.css'

export type EditorHandle = {
  getMarkdown: () => string
}

type Props = {
  initialValue: string
  onChange: (markdown: string) => void
}

/**
 * Thin wrapper around Milkdown Crepe. The editor owns its internal ProseMirror
 * document, so loading a different file means remounting this component (the
 * caller does that with a React `key`).
 */
export const Editor = forwardRef<EditorHandle, Props>(function Editor({ initialValue, onChange }, ref) {
  const hostRef = useRef<HTMLDivElement>(null)
  const crepeRef = useRef<Crepe | null>(null)
  const onChangeRef = useRef(onChange)
  const initialRef = useRef(initialValue)

  onChangeRef.current = onChange

  useImperativeHandle(
    ref,
    () => ({ getMarkdown: () => crepeRef.current?.getMarkdown() ?? initialRef.current }),
    [],
  )

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    const crepe = new Crepe({ root: host, defaultValue: initialRef.current })
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => {
        if (!disposed) onChangeRef.current(markdown)
      })
    })
    crepeRef.current = crepe

    crepe.create().catch((error: unknown) => {
      console.error('Failed to create the Markdown editor', error)
    })

    return () => {
      disposed = true
      crepeRef.current = null
      void crepe.destroy()
    }
  }, [])

  return <div className="editor-host" ref={hostRef} />
})
