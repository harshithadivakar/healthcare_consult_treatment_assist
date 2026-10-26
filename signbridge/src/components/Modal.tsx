import { X } from '@phosphor-icons/react'
import type { PropsWithChildren, ReactNode } from 'react'

interface ModalProps extends PropsWithChildren {
  title: string
  description?: string
  onClose: () => void
  actions?: ReactNode
  wide?: boolean
}

export function Modal({ title, description, onClose, actions, children, wide = false }: ModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
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
