// Shared demo store for the patient, interpreter and doctor views.
// Fictional data only. It is kept in this browser so a booking or message made in one view
// shows in the others (and in other tabs), and anything older than 7 days is deleted.
import { useSyncExternalStore } from 'react'
import type { Role } from './careJourney'
import type { Mode } from './demoDirectory'

export type Phase = 'Pre-consultation' | 'Post-consultation'

export interface Party {
  role: Role
  id: string
  name: string
}

export interface Booking {
  id: string
  patientId: string
  doctorId: string
  slot: string
  mode: Mode
  durationMinutes: number
  interpreterId: string | null
  coInterpreterId: string | null
  // Chosen outside their declared availability, so the interpreter has to confirm.
  pendingConfirmation: boolean
  noShow: boolean
  createdAt: number
}

export interface PortalMessage {
  id: string
  from: Party
  to: Party
  kind: 'message' | 'questionnaire' | 'answers' | 'interpretation'
  subject: string
  body: string
  questions?: string[]
  answers?: string[]
  phase?: Phase
  questionnaireId?: string
  createdAt: number
}

export interface InterpretationTask {
  id: string
  questionnaireId: string
  patientId: string
  doctorId: string
  phase: Phase
  // A recorded answer is a translation job: offered to a shortlist until one interpreter accepts.
  interpreterId: string | null
  offeredTo: string[]
  declinedBy: string[]
  videoSeconds: number
  due: string
  status: 'open' | 'awaiting' | 'sent'
  createdAt: number
}

export interface PortalData {
  version: 3
  bookings: Booking[]
  messages: PortalMessage[]
  tasks: InterpretationTask[]
  reportedNoShows: Record<string, number>
  // When each person last read each conversation, keyed `${readerId}|${otherId}`.
  readAt: Record<string, number>
}

export const retentionDays = 7
const retentionMs = retentionDays * 24 * 60 * 60 * 1000
const storageKey = 'signbridge-demo-portal-v3'

export const newId = () => crypto.randomUUID()

function seed(): PortalData {
  const now = Date.now()
  const hoursAgo = (hours: number) => now - hours * 60 * 60 * 1000
  const doctorBell: Party = { role: 'doctor', id: 'doc-bell', name: 'Dr Bell' }
  return {
    version: 3,
    bookings: [
      { id: 'seed-b1', patientId: 'pat-sam', doctorId: 'doc-bell', slot: 'Thu 29 Oct 09:30', mode: 'Online', durationMinutes: 30, interpreterId: 'int-amara', coInterpreterId: null, pendingConfirmation: false, noShow: false, createdAt: hoursAgo(50) },
      { id: 'seed-b2', patientId: 'pat-jordan', doctorId: 'doc-shah', slot: 'Thu 29 Oct 11:00', mode: 'Online', durationMinutes: 45, interpreterId: 'int-tom', coInterpreterId: null, pendingConfirmation: false, noShow: false, createdAt: hoursAgo(40) },
      { id: 'seed-b3', patientId: 'pat-bisi', doctorId: 'doc-shah', slot: 'Fri 30 Oct 13:45', mode: 'Online', durationMinutes: 90, interpreterId: null, coInterpreterId: null, pendingConfirmation: false, noShow: false, createdAt: hoursAgo(20) },
      { id: 'seed-b4', patientId: 'pat-cara', doctorId: 'doc-novak', slot: 'Fri 30 Oct 09:00', mode: 'In person', durationMinutes: 60, interpreterId: null, coInterpreterId: null, pendingConfirmation: false, noShow: false, createdAt: hoursAgo(18) },
      { id: 'seed-b6', patientId: 'pat-sam', doctorId: 'doc-bell', slot: 'Fri 30 Oct 20:30', mode: 'Online', durationMinutes: 30, interpreterId: 'int-amara', coInterpreterId: null, pendingConfirmation: false, noShow: false, createdAt: hoursAgo(12) },
      { id: 'seed-b5', patientId: 'pat-alex', doctorId: 'doc-bell', slot: 'Thu 29 Oct 14:15', mode: 'In person', durationMinutes: 30, interpreterId: null, coInterpreterId: null, pendingConfirmation: false, noShow: false, createdAt: hoursAgo(30) },
    ],
    messages: [
      {
        id: 'seed-m1', from: doctorBell, to: { role: 'patient', id: 'pat-alex', name: 'Alex Lewis' }, kind: 'questionnaire',
        subject: 'Before your appointment on Thu 29 Oct', phase: 'Pre-consultation',
        body: 'Please answer these questions in BSL or text before your appointment.',
        questions: [
          'What symptoms are you having, and when did they start?',
          'Are you taking any medicines at the moment?',
          'Is there anything else you would like to talk about?',
        ],
        createdAt: hoursAgo(26),
      },
      {
        id: 'seed-m2', from: { role: 'interpreter', id: 'int-amara', name: 'Amara Okafor' }, to: doctorBell, kind: 'interpretation',
        subject: 'Interpretation: Sam Morgan pre-consultation',
        body: 'Chest tightness for three days, worse on stairs. No known allergies. Takes ramipril each morning. Would like to discuss sleep.',
        createdAt: hoursAgo(6),
      },
      {
        id: 'seed-m3', from: { role: 'patient', id: 'pat-jordan', name: 'Jordan Davies' }, to: { role: 'doctor', id: 'doc-shah', name: 'Dr Shah' }, kind: 'message',
        subject: 'Running 5 minutes late', body: 'My bus is delayed, I will join the call at 11:05.', createdAt: hoursAgo(3),
      },
      {
        id: 'seed-m4', from: { role: 'doctor', id: 'doc-shah', name: 'Dr Shah' }, to: { role: 'patient', id: 'pat-bisi', name: 'Bisi Okonjo' }, kind: 'questionnaire',
        subject: 'Before your diabetes review', phase: 'Pre-consultation', body: 'Please answer these questions in BSL or text before your appointment.',
        questions: ['How have your blood sugar readings been this month?', 'Have you had any hypos?'],
        createdAt: hoursAgo(28),
      },
      {
        id: 'seed-m5', from: { role: 'doctor', id: 'doc-novak', name: 'Dr Novak' }, to: { role: 'patient', id: 'pat-cara', name: 'Cara Walsh' }, kind: 'questionnaire',
        subject: 'Follow-up after your physiotherapy', phase: 'Post-consultation', body: 'Please answer these questions in BSL or text.',
        questions: ['How is your knee after the exercises?', 'Has the swelling gone down?'],
        createdAt: hoursAgo(8),
      },
    ],
    tasks: [
      {
        id: 'seed-t1', questionnaireId: 'seed-q-sam', patientId: 'pat-sam', doctorId: 'doc-bell', phase: 'Pre-consultation',
        interpreterId: 'int-amara', offeredTo: ['int-amara', 'int-nadia', 'int-tom'], declinedBy: [], videoSeconds: 72, due: 'Thu 29 Oct 08:00', status: 'sent', createdAt: hoursAgo(30),
      },
      {
        id: 'seed-t2', questionnaireId: 'seed-m4', patientId: 'pat-bisi', doctorId: 'doc-shah', phase: 'Pre-consultation',
        interpreterId: 'int-amara', offeredTo: ['int-tom', 'int-amara', 'int-nadia'], declinedBy: [], videoSeconds: 380,
        due: 'Fri 30 Oct 08:00', status: 'awaiting', createdAt: hoursAgo(10),
      },
      {
        id: 'seed-t3', questionnaireId: 'seed-m5', patientId: 'pat-cara', doctorId: 'doc-novak', phase: 'Post-consultation',
        interpreterId: null, offeredTo: ['int-callum', 'int-amara', 'int-priya'], declinedBy: [], videoSeconds: 150,
        due: 'Fri 30 Oct 17:00', status: 'open', createdAt: hoursAgo(5),
      },
    ],
    reportedNoShows: {},
    readAt: {},
  }
}

function purgeExpired(data: PortalData): PortalData {
  const cutoff = Date.now() - retentionMs
  const keep = <T extends { createdAt: number }>(items: T[]) => items.filter((item) => item.createdAt >= cutoff)
  return { ...data, bookings: keep(data.bookings), messages: keep(data.messages), tasks: keep(data.tasks) }
}

function load(): PortalData {
  try {
    const saved = window.localStorage.getItem(storageKey)
    if (saved) {
      const parsed = JSON.parse(saved) as PortalData
      if (parsed.version === 3) return purgeExpired({ ...parsed, readAt: parsed.readAt ?? {} })
    }
  } catch {
    // Storage blocked or corrupt: fall back to the seed data in memory.
  }
  return seed()
}

function save(data: PortalData) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(data))
  } catch {
    // The demo still works in memory when storage is unavailable.
  }
}

let state = load()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

window.addEventListener('storage', (event) => {
  if (event.key !== storageKey) return
  state = load()
  emit()
})

export function updatePortal(update: (data: PortalData) => PortalData) {
  state = purgeExpired(update(state))
  save(state)
  emit()
}

export function markRead(readerId: string, otherId: string) {
  updatePortal((data) => ({ ...data, readAt: { ...data.readAt, [`${readerId}|${otherId}`]: Date.now() } }))
}

export function unreadCount(data: PortalData, readerId: string, fromId?: string) {
  return data.messages.filter((message) =>
    message.to.id === readerId
    && (!fromId || message.from.id === fromId)
    && message.createdAt > (data.readAt[`${readerId}|${message.from.id}`] ?? 0),
  ).length
}

export function resetPortal() {
  state = seed()
  save(state)
  emit()
}

export function usePortal() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    () => state,
  )
}

export function daysUntilDeleted(createdAt: number) {
  return Math.max(0, Math.ceil((createdAt + retentionMs - Date.now()) / (24 * 60 * 60 * 1000)))
}
