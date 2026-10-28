import { X } from '@phosphor-icons/react'
import { useEffect, useRef } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PropsWithChildren, ReactNode } from 'react'

interface ModalProps extends PropsWithChildren {
  title: string
  description?: string
  onClose: () => void
  actions?: ReactNode
  wide?: boolean
}

export function Modal({ title, description, onClose, actions, children, wide = false }: ModalProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const preferredTarget = dialog?.querySelector<HTMLElement>('[data-modal-autofocus]')
    const firstTarget = dialog?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const focusFrame = window.requestAnimationFrame(() => (preferredTarget ?? firstTarget)?.focus())

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', closeOnEscape)
      previouslyFocused?.focus()
    }
  }, [])

  const keepFocusInside = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ))
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" onKeyDown={keepFocusInside}>
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label={`Close ${title}`}>
            <X size={24} weight="bold" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {actions && <footer className="modal-actions">{actions}</footer>}
      </section>
    </div>
  )
}
