import { CheckCircle, Question, WarningOctagon } from '@phosphor-icons/react'
import type { MessageStatus } from '../types'

export function StatusBadge({ status }: { status: MessageStatus }) {
  const icon = status === 'Confirmed'
    ? <CheckCircle size={18} weight="fill" />
    : status === 'Needs confirmation'
      ? <Question size={18} weight="fill" />
      : <WarningOctagon size={18} weight="fill" />

  return <span className={`status-badge status-${status.toLowerCase().replaceAll(' ', '-')}`}>{icon}{status}</span>
}
