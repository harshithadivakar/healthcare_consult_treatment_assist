import {
  ArrowCounterClockwise,
  Brain,
  CalendarCheck,
  ChatCircleText,
  CheckCircle,
  Clock,
  CurrencyGbp,
  EnvelopeSimple,
  Keyboard,
  ListChecks,
  MapPin,
  Notepad,
  PaperPlaneTilt,
  Record,
  ShieldCheck,
  Star,
  Stop,
  Ticket,
  Tray,
  TrendDown,
  TrendUp,
  VideoCamera,
  WarningOctagon,
} from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { consultationNotes, roleLabels } from '../data/careJourney'
import type { Role } from '../data/careJourney'
import {
  allSlots,
  currentWeekDays,
  demoDays,
  demoPatientId,
  doctors,
  findDoctor,
  findInterpreter,
  findPatient,
  interpreterProfiles,
  patientNeeds,
  slotKey,
  slotOrder,
  splitSlot,
} from '../data/demoDirectory'
import type { Mode } from '../data/demoDirectory'
import { daysUntilDeleted, markRead, newId, resetPortal, unreadCount, updatePortal, usePortal } from '../data/portalStore'
import type { Booking, InterpretationTask, Party, Phase, PortalData, PortalMessage } from '../data/portalStore'
import { availableInterpreterCount, coInterpreterFor, declaredAvailability, modelInfo, rankInterpreters, translationShortlist } from '../lib/matching'
import { formatPounds, liveFee, rates, videoFee } from '../lib/pricing'
import type { Fee } from '../lib/pricing'
import type { Match } from '../lib/matching'
import { roleIcons } from './CareJourney'

interface RolePortalProps {
  role: Role
  onSwitchRole: (role: Role) => void
  onStartConversation: () => void
}

export function RolePortal({ role, onSwitchRole, onStartConversation }: RolePortalProps) {
  const data = usePortal()
  return (
    <section className="role-portal page-frame">
      <nav className="role-switcher" aria-label="Choose a view">
        {(['patient', 'interpreter', 'doctor'] as Role[]).map((item) => {
          const RoleIcon = roleIcons[item]
          return (
            <button className={`role-tab role-${item}`} aria-pressed={item === role} onClick={() => onSwitchRole(item)} key={item}>
              <RoleIcon size={22} weight="duotone" />{roleLabels[item]}
            </button>
          )
        })}
      </nav>
      <div className="portal-note-row">
        <p className="portal-note"><ShieldCheck size={19} />Fictional demo data, saved in this browser and deleted after 7 days. Open a second tab to watch changes arrive.</p>
        <button className="text-button" onClick={resetPortal}><ArrowCounterClockwise size={18} />Reset demo data</button>
      </div>
      {role === 'patient' && <PatientView data={data} onStartConversation={onStartConversation} />}
      {role === 'interpreter' && <InterpreterView data={data} />}
      {role === 'doctor' && <DoctorView data={data} />}
    </section>
  )
}

const partyFor = (role: Role, id: string): Party => ({
  role,
  id,
  name: (role === 'patient' ? findPatient(id)?.name : role === 'doctor' ? findDoctor(id)?.name : findInterpreter(id)?.name) ?? id,
})

const patientName = (id: string) => findPatient(id)?.name ?? id
const doctorName = (id: string) => findDoctor(id)?.name ?? id
const bySlot = (a: Booking, b: Booking) => slotOrder(a.slot) - slotOrder(b.slot)
const interpreterNames = (booking: Booking) =>
  [booking.interpreterId, booking.coInterpreterId].map((id) => findInterpreter(id)?.name).filter(Boolean).join(' + ')
const durationLabel = (minutes: number) => minutes % 60 === 0 ? `${minutes / 60} h` : minutes > 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`

function timeAgo(createdAt: number) {
  const minutes = Math.round((Date.now() - createdAt) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

function RoleAvatar({ role }: { role: Role }) {
  const RoleIcon = roleIcons[role]
  return <span className="role-avatar"><RoleIcon size={30} weight="duotone" /></span>
}

function PortalTabs<T extends string>({ tabs, active, onChange, label }: {
  tabs: Array<{ id: T; label: string; badge?: number }>
  active: T
  onChange: (tab: T) => void
  label: string
}) {
  return (
    <div className="portal-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button role="tab" aria-selected={tab.id === active} className="portal-tab" onClick={() => onChange(tab.id)} key={tab.id}>
          {tab.label}{tab.badge ? <span className="tab-badge">{tab.badge}</span> : null}
        </button>
      ))}
    </div>
  )
}

function StarRating({ label }: { label: string }) {
  const [value, setValue] = useState(0)
  return (
    <div className="star-rating" role="group" aria-label={label}>
      <span>{label}</span>
      <div>
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} aria-label={`${star} star${star > 1 ? 's' : ''}`} aria-pressed={value >= star} onClick={() => setValue(star)}>
            <Star size={22} weight={value >= star ? 'fill' : 'regular'} />
          </button>
        ))}
      </div>
      {value > 0 && <small>Thank you. Your rating is shared only with the matching service.</small>}
    </div>
  )
}

function ReasonChips({ match, limit = 3 }: { match: Match; limit?: number }) {
  return (
    <ul className="reason-chips" aria-label="Main reasons for this score">
      {match.reasons.slice(0, limit).map((reason) => (
        <li className={reason.impact >= 0 ? 'reason-up' : 'reason-down'} key={reason.label}>
          {reason.impact >= 0 ? <TrendUp size={15} weight="bold" /> : <TrendDown size={15} weight="bold" />}
          {reason.label}
        </li>
      ))}
    </ul>
  )
}

function ModelNote() {
  return (
    <p className="model-note">
      <Brain size={20} />
      <span>Ranked by a logistic regression trained with {modelInfo.library} on {modelInfo.trainingRows.toLocaleString('en-GB')} synthetic sessions (test AUC {modelInfo.metrics.testAuc}). Scores are a demonstration, and the final choice is yours.</span>
    </p>
  )
}

const partnerOf = (message: PortalMessage, meId: string) => (message.from.id === meId ? message.to : message.from)

function MessageCenter({ me, contacts, data, allowQuestionnaire = false }: {
  me: Party
  contacts: Party[]
  data: PortalData
  allowQuestionnaire?: boolean
}) {
  const mine = data.messages.filter((message) => message.to.id === me.id || message.from.id === me.id)
  const people = new Map<string, Party>()
  contacts.forEach((contact) => people.set(contact.id, contact))
  mine.forEach((message) => { const partner = partnerOf(message, me.id); people.set(partner.id, partner) })
  const lastActivity = (id: string) => Math.max(0, ...mine.filter((message) => partnerOf(message, me.id).id === id).map((message) => message.createdAt))
  const conversations = [...people.values()].filter((person) => lastActivity(person.id) > 0).sort((a, b) => lastActivity(b.id) - lastActivity(a.id))

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [kind, setKind] = useState<'message' | Phase>('message')
  const [body, setBody] = useState('')
  const selected = (selectedId && people.get(selectedId)) || conversations[0] || contacts[0]
  const thread = selected ? mine.filter((message) => partnerOf(message, me.id).id === selected.id).sort((a, b) => a.createdAt - b.createdAt) : []
  const unreadHere = selected ? unreadCount(data, me.id, selected.id) : 0
  const canAsk = allowQuestionnaire && selected?.role === 'patient'
  const asking = canAsk && kind !== 'message'

  useEffect(() => {
    if (selected && unreadHere > 0) markRead(me.id, selected.id)
  }, [me.id, selected, unreadHere])

  const send = () => {
    if (!selected || !body.trim()) return
    const lines = body.split('\n').map((line) => line.trim()).filter(Boolean)
    const message: PortalMessage = {
      id: newId(),
      from: me,
      to: selected,
      kind: asking ? 'questionnaire' : 'message',
      subject: !asking ? `Message from ${me.name}` : kind === 'Pre-consultation' ? 'Questions before your appointment' : 'Follow-up after your appointment',
      body: asking ? 'Please answer these questions in BSL or text.' : body.trim(),
      questions: asking ? lines : undefined,
      phase: asking ? kind as Phase : undefined,
      createdAt: Date.now(),
    }
    updatePortal((current) => ({ ...current, messages: [...current.messages, message], readAt: { ...current.readAt, [`${me.id}|${selected.id}`]: Date.now() } }))
    setBody('')
    setKind('message')
  }

  return (
    <div className="messenger">
      <aside className="conversation-list" aria-label="Conversations">
        <label className="input-block start-conversation"><span>Start a conversation</span>
          <select value="" onChange={(event) => event.target.value && setSelectedId(event.target.value)}>
            <option value="">Choose a person</option>
            {[...people.values()].map((person) => <option value={person.id} key={person.id}>{person.name} ({roleLabels[person.role].toLowerCase()})</option>)}
          </select>
        </label>
        {conversations.length === 0 && <p className="panel-intro">No conversations yet.</p>}
        <ul>
          {conversations.map((person) => {
            const last = [...mine].filter((message) => partnerOf(message, me.id).id === person.id).sort((a, b) => b.createdAt - a.createdAt)[0]
            const unread = unreadCount(data, me.id, person.id)
            return (
              <li key={person.id}>
                <button aria-pressed={selected?.id === person.id} onClick={() => setSelectedId(person.id)} aria-label={`${person.name}${unread ? `, ${unread} unread` : ''}`}>
                  <span className="conversation-name"><strong>{person.name}</strong><small>{roleLabels[person.role]} · {timeAgo(last.createdAt)}</small></span>
                  <span className="conversation-preview">{last.from.id === me.id ? 'You: ' : ''}{last.kind === 'message' ? last.body : last.subject}</span>
                  {unread > 0 && <span className="tab-badge">{unread}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <section className="thread" aria-label={selected ? `Conversation with ${selected.name}` : 'Conversation'}>
        {selected && (
          <>
            <header className="thread-heading">
              <strong>{selected.name}</strong>
              <small>{roleLabels[selected.role]}</small>
            </header>
            <ol className="thread-messages" aria-live="polite">
              {thread.length === 0 && <li className="panel-intro">No messages with {selected.name} yet. Say hello below.</li>}
              {thread.map((message) => {
                const outgoing = message.from.id === me.id
                return (
                  <li className={`bubble ${outgoing ? 'bubble-out' : 'bubble-in'}`} key={message.id}>
                    {message.kind !== 'message' && (
                      <span className={`kind-chip kind-${message.kind}`}>
                        {message.kind === 'interpretation' ? 'Interpretation' : message.kind === 'answers' ? 'Typed answers' : message.phase ?? 'Questionnaire'}
                      </span>
                    )}
                    {message.kind !== 'message' && <strong>{message.subject}</strong>}
                    {message.kind === 'answers' ? <TypedAnswers data={data} message={message} /> : <p>{message.body}</p>}
                    {message.questions && <ol className="question-list">{message.questions.map((question) => <li key={question}>{question}</li>)}</ol>}
                    {message.kind === 'questionnaire' && <AnswerChain data={data} questionnaire={message} />}
                    <small>{outgoing ? 'You' : message.from.name} · {timeAgo(message.createdAt)} · deleted in {daysUntilDeleted(message.createdAt)} days</small>
                  </li>
                )
              })}
            </ol>
            <form className="thread-composer" onSubmit={(event) => { event.preventDefault(); send() }}>
              {canAsk && (
                <label className="composer-kind"><span>Type</span>
                  <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
                    <option value="message">Message</option>
                    <option value="Pre-consultation">Pre-consultation questionnaire</option>
                    <option value="Post-consultation">Post-consultation follow-up</option>
                  </select>
                </label>
              )}
              <label className="input-block">
                <span>{asking ? `Questions for ${selected.name}, one per line` : `Message to ${selected.name}`}</span>
                <textarea
                  rows={2}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !asking) { event.preventDefault(); send() }
                  }}
                />
              </label>
              <div className="composer-row">
                <small>{asking ? 'Typed answers come straight to you. Recorded BSL answers go to an interpreter for translation first.' : 'Enter to send · Shift + Enter for a new line'}</small>
                <button type="submit" className="primary-button" disabled={!body.trim()}><PaperPlaneTilt size={20} />Send</button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  )
}

function TypedAnswers({ data, message }: { data: PortalData; message: PortalMessage }) {
  const questions = data.messages.find((item) => item.id === message.questionnaireId)?.questions ?? []
  return (
    <dl className="answer-list">
      {(message.answers ?? []).map((answer, index) => <div key={index}><dt>{questions[index] ?? `Answer ${index + 1}`}</dt><dd>{answer}</dd></div>)}
    </dl>
  )
}

/** Where a questionnaire's answers are, so the doctor and patient can both follow the chain. */
function AnswerChain({ data, questionnaire }: { data: PortalData; questionnaire: PortalMessage }) {
  const patient = questionnaire.to.name
  const doctor = questionnaire.from.name
  const typed = data.messages.find((message) => message.kind === 'answers' && message.questionnaireId === questionnaire.id)
  const task = data.tasks.find((item) => item.questionnaireId === questionnaire.id)
  const steps: Array<{ done: boolean; text: string }> = [{ done: true, text: `${doctor} sent the questions` }]
  if (typed) {
    steps.push({ done: true, text: `${patient} typed the answers and sent them straight to ${doctor}` })
  } else if (task) {
    steps.push({ done: true, text: `${patient} recorded the answers in BSL (${Math.floor(task.videoSeconds / 60)} min ${task.videoSeconds % 60} s)` })
    if (task.status === 'open') {
      const waiting = task.offeredTo.filter((id) => !task.declinedBy.includes(id)).length
      steps.push({ done: false, text: `Offered to ${waiting} interpreter${waiting === 1 ? '' : 's'} for translation. Waiting for one to accept` })
    } else {
      steps.push({ done: true, text: `${findInterpreter(task.interpreterId)?.name} accepted the translation` })
    }
    steps.push(task.status === 'sent'
      ? { done: true, text: `English translation sent to ${doctor}` }
      : { done: false, text: `Translation due to ${doctor} by ${task.due}` })
  } else {
    steps.push({ done: false, text: `Waiting for ${patient} to answer` })
  }
  return (
    <ol className="answer-chain" aria-label="Answer progress">
      {steps.map((step) => (
        <li className={step.done ? 'chain-done' : 'chain-waiting'} key={step.text}>
          {step.done ? <CheckCircle size={16} weight="fill" /> : <Clock size={16} />}{step.text}
        </li>
      ))}
    </ol>
  )
}

type PatientTab = 'book' | 'interpreter' | 'messages' | 'notes'

function PatientView({ data, onStartConversation }: { data: PortalData; onStartConversation: () => void }) {
  const me = partyFor('patient', demoPatientId)
  const [tab, setTab] = useState<PatientTab>('book')
  const [bookingId, setBookingId] = useState<string | null>(null)
  const myBookings = data.bookings.filter((booking) => booking.patientId === me.id).sort(bySlot)
  const openQuestionnaires = data.messages.filter((message) =>
    message.kind === 'questionnaire' && message.to.id === me.id
    && !data.tasks.some((task) => task.questionnaireId === message.id)
    && !data.messages.some((answer) => answer.kind === 'answers' && answer.questionnaireId === message.id))

  const chooseFor = (id: string) => { setBookingId(id); setTab('interpreter') }

  return (
    <div className="portal-view">
      <header className="portal-heading role-patient">
        <RoleAvatar role="patient" />
        <div><p>Patient view</p><h1>Hello, {me.name}</h1></div>
      </header>
      <PortalTabs
        label="Patient sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'book', label: 'Book a slot' },
          { id: 'interpreter', label: 'Choose interpreter', badge: myBookings.filter((booking) => !booking.interpreterId && !booking.noShow).length },
          { id: 'messages', label: 'Messages', badge: openQuestionnaires.length + unreadCount(data, me.id) },
          { id: 'notes', label: 'My notes' },
        ]}
      />
      {tab === 'book' && <PatientBooking data={data} myBookings={myBookings} onChoose={chooseFor} />}
      {tab === 'interpreter' && (
        <PatientInterpreterChoice
          data={data}
          myBookings={myBookings.filter((booking) => !booking.noShow)}
          bookingId={bookingId}
          onSelectBooking={setBookingId}
          onStartConversation={onStartConversation}
        />
      )}
      {tab === 'messages' && (
        <div className="portal-panel" role="tabpanel">
          <h2>Messages</h2>
          {openQuestionnaires.map((questionnaire) => <QuestionnaireAnswer data={data} questionnaire={questionnaire} key={questionnaire.id} />)}
          <MessageCenter
            me={me}
            data={data}
            contacts={[
              ...doctors.map((doctor) => partyFor('doctor', doctor.id)),
              ...[...new Set(myBookings.flatMap((booking) => [booking.interpreterId, booking.coInterpreterId]).filter((id): id is string => Boolean(id)))].map((id) => partyFor('interpreter', id)),
            ]}
          />
        </div>
      )}
      {tab === 'notes' && <PatientNotes />}
    </div>
  )
}

function PatientBooking({ data, myBookings, onChoose }: { data: PortalData; myBookings: Booking[]; onChoose: (bookingId: string) => void }) {
  const [doctorId, setDoctorId] = useState(doctors[0].id)
  const [slot, setSlot] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('Online')
  const [duration, setDuration] = useState(30)
  const [needId, setNeedId] = useState(patientNeeds[0].id)
  const need = patientNeeds.find((item) => item.id === needId) ?? patientNeeds[0]
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const doctor = findDoctor(doctorId) ?? doctors[0]
  const matches = slot ? rankInterpreters(data, { patientId: demoPatientId, doctorId, slot, mode, treatmentArea: need.specialty }) : []
  const recommended = matches.filter((match) => match.available && !match.penalised).slice(0, 3).map((match) => match.interpreter.id)
  // The best recommended interpreter is chosen unless the patient picks someone else.
  const chosen = matches.find((match) => match.interpreter.id === chosenId) ?? matches.find((match) => match.interpreter.id === recommended[0])
  const pickSlot = (value: string | null) => { setSlot(value); setChosenId(null) }

  const book = () => {
    if (!slot || !chosen) return
    const draft: Booking = {
      id: newId(), patientId: demoPatientId, doctorId, slot, mode, durationMinutes: duration, treatmentArea: need.specialty,
      interpreterId: chosen.interpreter.id, coInterpreterId: null, pendingConfirmation: !chosen.available, noShow: false, createdAt: Date.now(),
    }
    updatePortal((current) => ({ ...current, bookings: [...current.bookings, { ...draft, coInterpreterId: coInterpreterFor(current, draft, chosen.interpreter.id) }] }))
    setConfirmation(`Booked with ${doctor.name} on ${slot}, ${mode.toLowerCase()}, ${durationLabel(duration)}, with ${chosen.interpreter.name}${chosen.available ? '' : ' (waiting for them to confirm)'}.`)
    pickSlot(null)
  }

  return (
    <div className="portal-panel" role="tabpanel">
      <h2>Book an appointment</h2>
      <fieldset className="doctor-choice">
        <legend>What do you need help with?</legend>
        {patientNeeds.map((item) => (
          <label key={item.id}>
            <input type="radio" name="need" checked={needId === item.id} onChange={() => { setNeedId(item.id); setChosenId(null) }} />
            <span><strong>{item.label}</strong><small>{item.specialty}</small></span>
          </label>
        ))}
      </fieldset>
      <fieldset className="doctor-choice">
        <legend>Doctor</legend>
        {doctors.map((item) => (
          <label key={item.id}>
            <input type="radio" name="doctor" checked={doctorId === item.id} onChange={() => { setDoctorId(item.id); pickSlot(null) }} />
            <span><strong>{item.name}</strong><small>{item.specialty} · {item.practice}</small></span>
          </label>
        ))}
      </fieldset>
      <fieldset className="mode-choice">
        <legend>How would you like the interpreter to join?</legend>
        {(['Online', 'In person'] as const).map((item) => (
          <label key={item}>
            <input type="radio" name="mode" checked={mode === item} onChange={() => { setMode(item); pickSlot(null) }} />
            {item === 'Online' ? <VideoCamera size={20} /> : <MapPin size={20} />}{item === 'Online' ? 'Online video call' : 'In person at the surgery'}
          </label>
        ))}
      </fieldset>
      <fieldset className="mode-choice">
        <legend>How long do you need?</legend>
        {[30, 60, 90].map((minutes) => (
          <label key={minutes}>
            <input type="radio" name="duration" checked={duration === minutes} onChange={() => { setDuration(minutes); pickSlot(null) }} />
            {durationLabel(minutes)}{minutes > 60 ? ' (2 interpreters needed)' : ''}
          </label>
        ))}
      </fieldset>
      <div className="slot-grid">
        {doctor.slots.map((item) => {
          const taken = data.bookings.some((booking) => booking.doctorId === doctorId && booking.slot === item)
          const free = availableInterpreterCount(data, item, mode)
          const needed = duration > 60 ? 2 : 1
          const { day, time } = splitSlot(item)
          return (
            <button className="slot-button" aria-pressed={slot === item} disabled={taken || free < needed} onClick={() => pickSlot(item)} key={item}>
              <strong>{day}</strong>
              <span><Clock size={16} />{time}</span>
              <small>{taken ? 'Already booked' : free === 0 ? 'No interpreter free' : free < needed ? `Needs 2 interpreters, ${free} free` : `${free} interpreter${free > 1 ? 's' : ''} free`}</small>
            </button>
          )
        })}
      </div>
      {slot && chosen && (
        <fieldset className="recommend-preview">
          <legend>Choose your interpreter</legend>
          <p className="panel-intro">Recommended from your requirements: {need.label} · {mode} · {durationLabel(duration)}. You can pick anyone.</p>
          <ul className="interpreter-picks">
            {matches.map((match) => (
              <li key={match.interpreter.id}>
                <label className={chosen.interpreter.id === match.interpreter.id ? 'selected' : ''}>
                  <input type="radio" name="interpreter" checked={chosen.interpreter.id === match.interpreter.id} onChange={() => setChosenId(match.interpreter.id)} />
                  <span>
                    <strong>{match.interpreter.name}</strong>
                    {recommended.includes(match.interpreter.id) && <span className="kind-chip kind-recommended">Recommended</span>}
                    <small>{match.score}% match · {match.reasons.filter((reason) => reason.impact > 0)[0]?.label ?? match.interpreter.region + ' BSL'}{match.available ? '' : ' · Not on their declared availability, they will be asked to confirm'}</small>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <button className="primary-button" disabled={!slot || !chosen} onClick={book}><CalendarCheck size={20} />Book appointment{chosen && slot ? ` with ${chosen.interpreter.name.split(' ')[0]}` : ''}</button>
      {confirmation && <p className="portal-success" role="status"><CheckCircle size={20} weight="fill" />{confirmation}</p>}

      <h3 className="subsection-title">Your appointments</h3>
      {myBookings.length === 0 && <p className="panel-intro">No appointments yet.</p>}
      <ul className="booking-list">
        {myBookings.map((booking) => {
          const interpreter = findInterpreter(booking.interpreterId)
          return (
            <li key={booking.id}>
              <span className="booking-when"><strong>{booking.slot}</strong><small>{doctorName(booking.doctorId)} · {booking.mode} · {durationLabel(booking.durationMinutes)}</small></span>
              {booking.noShow ? <span className="pre-status pre-awaiting-patient">Interpreter no-show reported</span>
                : interpreter && booking.pendingConfirmation ? <span className="pre-status pre-awaiting-patient">Waiting for {interpreter.name} to confirm</span>
                : interpreter ? <span className="pre-status pre-interpreted">Interpreter: {interpreterNames(booking)}</span>
                  : <button className="secondary-button small-button" onClick={() => onChoose(booking.id)}>Choose an interpreter</button>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PatientInterpreterChoice({ data, myBookings, bookingId, onSelectBooking, onStartConversation }: {
  data: PortalData
  myBookings: Booking[]
  bookingId: string | null
  onSelectBooking: (id: string) => void
  onStartConversation: () => void
}) {
  const booking = myBookings.find((item) => item.id === bookingId) ?? myBookings.find((item) => !item.interpreterId) ?? myBookings[0]
  if (!booking) {
    return <div className="portal-panel" role="tabpanel"><h2>Choose an interpreter</h2><p className="panel-intro">Book an appointment first.</p></div>
  }
  const matches = rankInterpreters(data, { patientId: booking.patientId, doctorId: booking.doctorId, slot: booking.slot, mode: booking.mode, bookingId: booking.id, treatmentArea: booking.treatmentArea })
  const need = patientNeeds.find((item) => item.specialty === (booking.treatmentArea ?? findDoctor(booking.doctorId)?.specialty))

  const choose = (match: Match) => updatePortal((current) => ({
    ...current,
    bookings: current.bookings.map((item) => item.id === booking.id
      ? { ...item, interpreterId: match.interpreter.id, coInterpreterId: coInterpreterFor(current, item, match.interpreter.id), pendingConfirmation: !match.available }
      : item),
  }))

  const reportNoShow = () => {
    if (!booking.interpreterId) return
    const missed = booking.interpreterId
    updatePortal((current) => ({
      ...current,
      bookings: current.bookings.map((item) => item.id === booking.id ? { ...item, noShow: true } : item),
      reportedNoShows: { ...current.reportedNoShows, [missed]: (current.reportedNoShows[missed] ?? 0) + 1 },
    }))
    onStartConversation()
  }

  return (
    <div className="portal-panel" role="tabpanel">
      <h2>Recommended interpreters</h2>
      {myBookings.length > 1 && (
        <div className="booking-picker" role="radiogroup" aria-label="Appointment">
          {myBookings.map((item) => (
            <button role="radio" aria-checked={item.id === booking.id} onClick={() => onSelectBooking(item.id)} key={item.id}>
              {item.slot} · {doctorName(item.doctorId)}
            </button>
          ))}
        </div>
      )}
      <p className="panel-intro">For <strong>{booking.slot}</strong> with {doctorName(booking.doctorId)}, {booking.mode.toLowerCase()}, {durationLabel(booking.durationMinutes)}.</p>
      <p className="requirements-line"><ListChecks size={18} />Based on your requirements: <strong>{need?.label ?? findDoctor(booking.doctorId)?.specialty}</strong> · {booking.mode} · {durationLabel(booking.durationMinutes)}, and the times interpreters have reported as free.</p>
      {booking.durationMinutes > 60 && (
        <p className="two-interpreter-note"><WarningOctagon size={20} weight="fill" /><span><strong>This appointment needs 2 interpreters.</strong> It is over an hour, so two interpreters take turns to avoid fatigue. Choose the lead interpreter and the platform adds the best available co-interpreter.{booking.coInterpreterId ? ` Co-interpreter: ${findInterpreter(booking.coInterpreterId)?.name}.` : booking.interpreterId ? ' No second interpreter is free yet.' : ''}</span></p>
      )}
      <ModelNote />
      <ol className="interpreter-list">
        {matches.map((match, index) => {
          const chosen = booking.interpreterId === match.interpreter.id
          const isCo = booking.coInterpreterId === match.interpreter.id
          return (
            <li className={`interpreter-card${chosen || isCo ? ' chosen' : ''}`} key={match.interpreter.id}>
              <span className="interpreter-rank">{index + 1}</span>
              <span className="interpreter-initials" aria-hidden="true">{match.interpreter.initials}</span>
              <div className="interpreter-copy">
                <strong>{match.interpreter.name}</strong>
                <span className="match-meter" aria-label={`${match.score}% predicted good session`}><span style={{ width: `${match.score}%` }} /></span>
                <small>{match.score}% predicted good session · {match.interpreter.region} BSL · {match.interpreter.modes.join(' or ')}</small>
                <ReasonChips match={match} />
                {match.penalised && <small className="flag-text"><WarningOctagon size={15} weight="fill" />Last priority: missed an appointment</small>}
                {!match.available && !chosen && !isCo && <small className="availability-note">Not on their declared availability for this time or mode. Choosing them sends a request to confirm.</small>}
                {chosen && booking.pendingConfirmation && <small className="availability-note">Request sent. Waiting for {match.interpreter.name.split(' ')[0]} to confirm.</small>}
              </div>
              <button
                className={chosen ? 'primary-button small-button' : 'secondary-button small-button'}
                disabled={isCo}
                onClick={() => choose(match)}
              >
                {chosen ? <><CheckCircle size={18} weight="fill" />{booking.durationMinutes > 60 ? 'Lead' : 'Chosen'}</> : isCo ? <><CheckCircle size={18} weight="fill" />Co-interpreter</> : `Choose ${match.interpreter.name.split(' ')[0]}`}
              </button>
            </li>
          )
        })}
      </ol>
      {booking.interpreterId && (
        <div className="no-show-box">
          <WarningOctagon size={26} weight="fill" />
          <div>
            <strong>Interpreter has not arrived?</strong>
            <p>Report it and keep your appointment using live captions, typed messages and text to speech. The interpreter moves to last priority for future matches.</p>
            <button className="secondary-button small-button" onClick={reportNoShow}><Keyboard size={18} />Report no-show and continue with captions</button>
          </div>
        </div>
      )}
    </div>
  )
}

function QuestionnaireAnswer({ data, questionnaire }: { data: PortalData; questionnaire: PortalMessage }) {
  const questions = questionnaire.questions ?? []
  const doctor = questionnaire.from.name
  const [answerMode, setAnswerMode] = useState<'record' | 'type'>('record')
  const [recording, setRecording] = useState<'idle' | 'recording' | 'saved'>('idle')
  const [answers, setAnswers] = useState(questions.map(() => ''))
  const canSend = answerMode === 'record' ? recording === 'saved' : answers.every((answer) => answer.trim())

  const send = () => {
    const doctorId = questionnaire.from.id
    const phase = questionnaire.phase ?? 'Pre-consultation'
    if (answerMode === 'type') {
      const message: PortalMessage = {
        id: newId(),
        from: questionnaire.to,
        to: questionnaire.from,
        kind: 'answers',
        subject: `Answers: ${questionnaire.subject}`,
        body: 'Typed answers to your questionnaire.',
        answers,
        phase,
        questionnaireId: questionnaire.id,
        createdAt: Date.now(),
      }
      updatePortal((current) => ({ ...current, messages: [...current.messages, message] }))
      return
    }
    const appointment = data.bookings.filter((booking) => booking.patientId === demoPatientId && booking.doctorId === doctorId).sort(bySlot)[0]
    const task: InterpretationTask = {
      id: newId(),
      questionnaireId: questionnaire.id,
      patientId: demoPatientId,
      doctorId,
      phase,
      interpreterId: null,
      offeredTo: translationShortlist(data, demoPatientId, doctorId),
      declinedBy: [],
      videoSeconds: 72,
      due: phase === 'Pre-consultation' && appointment ? slotKey(splitSlot(appointment.slot).day, '08:00') : 'Fri 30 Oct 17:00',
      status: 'open',
      createdAt: Date.now(),
    }
    updatePortal((current) => ({ ...current, tasks: [...current.tasks, task] }))
  }

  return (
    <article className="questionnaire-card">
      <div className="message-head"><EnvelopeSimple size={20} /><strong>{doctor}</strong><span className="kind-chip kind-questionnaire">{questionnaire.phase ?? 'Questionnaire'}</span><span>{timeAgo(questionnaire.createdAt)}</span></div>
      <h3>{questionnaire.subject}</h3>
      <ol className="question-list">{questions.map((question) => <li key={question}>{question}</li>)}</ol>
      <div className="answer-mode" role="radiogroup" aria-label="How do you want to answer?">
        <button role="radio" aria-checked={answerMode === 'record'} onClick={() => setAnswerMode('record')}>
          <VideoCamera size={20} /><span>Record in BSL<small>An interpreter translates it for {doctor}</small></span>
        </button>
        <button role="radio" aria-checked={answerMode === 'type'} onClick={() => setAnswerMode('type')}>
          <Keyboard size={20} /><span>Type answers<small>Goes straight to {doctor}</small></span>
        </button>
      </div>
      {answerMode === 'record' ? (
        <div className="record-stage">
          <VideoCamera size={44} weight="duotone" />
          <p><strong>Simulated recording.</strong> No video is captured in this prototype.</p>
          {recording === 'idle' && <button className="secondary-button" onClick={() => setRecording('recording')}><Record size={20} weight="fill" />Start recording</button>}
          {recording === 'recording' && <button className="danger-button" onClick={() => setRecording('saved')}><Stop size={20} weight="fill" />Stop recording</button>}
          {recording === 'saved' && <p className="portal-success"><CheckCircle size={20} weight="fill" />Simulated answer ready (1 min 12 s). <button className="text-button" onClick={() => setRecording('idle')}>Record again</button></p>}
        </div>
      ) : (
        <div className="typed-answers">
          {questions.map((question, index) => (
            <label className="input-block" key={question}>
              <span>{question}</span>
              <textarea rows={2} value={answers[index]} onChange={(event) => setAnswers(answers.map((answer, i) => i === index ? event.target.value : answer))} />
            </label>
          ))}
        </div>
      )}
      <button className="primary-button" disabled={!canSend} onClick={send}>
        <PaperPlaneTilt size={20} />{answerMode === 'record' ? 'Send for translation' : `Send to ${doctor}`}
      </button>
    </article>
  )
}

function PatientNotes() {
  const [ticketRaised, setTicketRaised] = useState(false)
  return (
    <div className="portal-panel" role="tabpanel">
      <h2>Consultation notes</h2>
      {consultationNotes.map((note) => (
        <article className="note-card" key={note.date}>
          <div className="message-head"><Notepad size={20} /><strong>{note.date} · {note.doctor}</strong><span>Interpreter: {note.interpreter}</span></div>
          <p>{note.summary}</p>
          <p className="retention-note"><Clock size={17} />Deleted automatically in {note.deletesIn}.</p>
          <StarRating label={`Rate ${note.interpreter}`} />
          <button className="text-button" onClick={() => setTicketRaised(true)} disabled={ticketRaised}><Ticket size={19} />{ticketRaised ? 'Ticket raised' : 'Raise a ticket or complaint'}</button>
        </article>
      ))}
    </div>
  )
}

type CalendarKind = 'deadline' | 'appointment'

function InterpreterView({ data }: { data: PortalData }) {
  const [meId, setMeId] = useState(interpreterProfiles[0].id)
  const me = findInterpreter(meId) ?? interpreterProfiles[0]
  const meParty = partyFor('interpreter', me.id)
  const myBookings = data.bookings.filter((booking) => (booking.interpreterId === me.id || booking.coInterpreterId === me.id) && !booking.noShow)
  const myTasks = data.tasks.filter((task) => task.interpreterId === me.id)
  const penalised = (data.reportedNoShows[me.id] ?? 0) > 0

  const calendar = [
    ...myBookings.map((booking) => ({
      id: booking.id, slot: booking.slot, kind: 'appointment' as CalendarKind,
      title: `Consultation · ${booking.mode}${booking.coInterpreterId === me.id ? ' (co-interpreter)' : ''}${booking.pendingConfirmation ? ' (to confirm)' : ''}`, detail: `${patientName(booking.patientId)} with ${doctorName(booking.doctorId)}`,
    })),
    ...myTasks.filter((task) => task.status === 'awaiting').map((task) => ({
      id: task.id, slot: task.due, kind: 'deadline' as CalendarKind,
      title: `${task.phase === 'Pre-consultation' ? 'Pre-consult' : 'Post-consult'} translation due`, detail: `${patientName(task.patientId)} for ${doctorName(task.doctorId)}`,
    })),
  ]

  const jobs = data.tasks
    .filter((task) => task.status === 'open' && task.offeredTo.includes(me.id) && !task.declinedBy.includes(me.id))
    .map((task) => ({ task, match: rankInterpreters(data, { patientId: task.patientId, doctorId: task.doctorId }).find((item) => item.interpreter.id === me.id)! }))
  const requests = myBookings.filter((booking) => booking.pendingConfirmation && booking.interpreterId === me.id)

  const acceptJob = (taskId: string) => updatePortal((current) => ({
    ...current,
    tasks: current.tasks.map((item) => item.id === taskId && item.status === 'open' ? { ...item, interpreterId: me.id, status: 'awaiting' } : item),
  }))
  // Once everyone on the shortlist has declined, the job goes to the next best interpreters.
  const declineJob = (taskId: string) => updatePortal((current) => ({
    ...current,
    tasks: current.tasks.map((item) => {
      if (item.id !== taskId) return item
      const declinedBy = [...item.declinedBy, me.id]
      const everyoneDeclined = item.offeredTo.every((id) => declinedBy.includes(id))
      const offeredTo = everyoneDeclined ? [...item.offeredTo, ...translationShortlist(current, item.patientId, item.doctorId, item.offeredTo)] : item.offeredTo
      return { ...item, declinedBy, offeredTo }
    }),
  }))
  const answerRequest = (bookingId: string, accepted: boolean) => updatePortal((current) => ({
    ...current,
    bookings: current.bookings.map((item) => item.id !== bookingId ? item
      : accepted ? { ...item, pendingConfirmation: false }
        : { ...item, interpreterId: null, coInterpreterId: null, pendingConfirmation: false }),
  }))

  const contacts = [
    ...doctors.map((doctor) => partyFor('doctor', doctor.id)),
    ...[...new Set(myBookings.map((booking) => booking.patientId))].map((id) => partyFor('patient', id)),
  ]

  return (
    <div className="portal-view">
      <header className="portal-heading role-interpreter">
        <RoleAvatar role="interpreter" />
        <div>
          <p>BSL interpreter view</p>
          <label className="viewing-as"><span>Viewing as</span>
            <select value={me.id} onChange={(event) => setMeId(event.target.value)} aria-label="Viewing as interpreter">
              {interpreterProfiles.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
        <dl className="interpreter-summary">
          <div><dt>On time</dt><dd>{Math.round(me.onTimeRate * 100)}%</dd></div>
          <div><dt>Region</dt><dd>{me.region}</dd></div>
          <div><dt>Match priority</dt><dd className={penalised ? 'danger-text' : ''}>{penalised ? 'Last' : 'Normal'}</dd></div>
        </dl>
      </header>

      <section className="portal-panel" aria-labelledby="calendar-title">
        <h2 id="calendar-title">Next five working days</h2>
        <p className="panel-intro">Consultations are booked straight into your calendar from the availability you declared.</p>
        <ul className="calendar-legend" aria-label="Calendar key">
          <li className="kind-pre-deadline">Interpretation deadline</li>
          <li className="kind-appointment">Consultation appointment</li>
        </ul>
        <div className="week-calendar">
          {demoDays.map((day) => (
            <div className={day === demoDays[0] ? 'calendar-day today' : 'calendar-day'} key={day}>
              <h3>{day}{day === demoDays[0] && <small>Today</small>}</h3>
              {calendar.filter((item) => splitSlot(item.slot).day === day).sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot)).map((item) => (
                <article className={`calendar-item kind-${item.kind === 'deadline' ? 'pre-deadline' : 'appointment'}`} key={item.id}>
                  <time>{splitSlot(item.slot).time}</time>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>

      <AvailabilityEditor data={data} interpreterId={me.id} />

      <section className="portal-panel" aria-labelledby="inbox-title">
        <h2 id="inbox-title"><Tray size={24} />Interpretations to do</h2>
        {myTasks.filter((task) => task.status === 'awaiting').length === 0 && <p className="panel-intro">Nothing waiting. New answers from patients appear here.</p>}
        {myTasks.filter((task) => task.status === 'awaiting').map((task) => <InterpretationWork data={data} task={task} me={meParty} key={task.id} />)}
      </section>

      <section className="portal-panel" aria-labelledby="jobs-title">
        <h2 id="jobs-title"><ListChecks size={24} />New translation jobs</h2>
        <p className="panel-intro">Recorded answers to pre- and post-consultation questions. Take the ones you want; the first to accept gets the job.</p>
        {jobs.length === 0 && <p className="panel-intro">No translation jobs offered to you right now.</p>}
        <div className="task-list">
          {jobs.map(({ task, match }) => (
            <article className="task-card" key={task.id}>
              <div className="task-top">
                <span className={`kind-chip kind-${task.phase === 'Pre-consultation' ? 'pre-deadline' : 'post-deadline'}`}>{task.phase} translation</span>
                <span className="match-score">{match.score}% match</span>
              </div>
              <h3>{patientName(task.patientId)} · {findDoctor(task.doctorId)?.specialty}</h3>
              <p className="task-meta"><VideoCamera size={16} />{Math.floor(task.videoSeconds / 60)} min {task.videoSeconds % 60} s BSL video for {doctorName(task.doctorId)}</p>
              <p className="task-meta"><Clock size={16} />Due {task.due}</p>
              <p className="task-meta"><CurrencyGbp size={16} />Earnings: {formatPounds(videoFee(task.videoSeconds).total)}</p>
              <details>
                <summary>Why you were matched</summary>
                <ReasonChips match={match} limit={4} />
              </details>
              <div className="compact-actions">
                <button className="primary-button small-button" onClick={() => acceptJob(task.id)}>Accept</button>
                <button className="text-button" onClick={() => declineJob(task.id)}>Decline</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {requests.length > 0 && (
        <section className="portal-panel" aria-labelledby="requests-title">
          <h2 id="requests-title">Requests outside your availability</h2>
          <p className="panel-intro">A patient chose you for a time you had not declared. Confirm if you can make it.</p>
          <div className="task-list">
            {requests.map((booking) => (
              <article className="task-card" key={booking.id}>
                <span className="kind-chip kind-appointment">Consultation · {booking.mode}</span>
                <h3>{patientName(booking.patientId)} with {doctorName(booking.doctorId)}</h3>
                <p className="task-meta"><Clock size={16} />{booking.slot} · {durationLabel(booking.durationMinutes)}</p>
                <p className="task-meta"><CurrencyGbp size={16} />Earnings: {formatPounds(liveFee(booking.durationMinutes, booking.slot).perInterpreter)}</p>
                <div className="compact-actions">
                  <button className="primary-button small-button" onClick={() => answerRequest(booking.id, true)}>Confirm</button>
                  <button className="text-button" onClick={() => answerRequest(booking.id, false)}>Decline</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="portal-panel" aria-labelledby="interpreter-messages-title">
        <h2 id="interpreter-messages-title"><ChatCircleText size={24} />Messages{unreadCount(data, me.id) > 0 && <span className="tab-badge">{unreadCount(data, me.id)} unread</span>}</h2>
        <MessageCenter me={meParty} contacts={contacts} data={data} key={me.id} />
      </section>

      <div className="portal-columns">
        <section className="portal-panel" aria-labelledby="matching-title">
          <h2 id="matching-title">How matching works</h2>
          <ModelNote />
          <ul className="factor-list">
            {[...modelInfo.features].sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef)).map((feature) => (
              <li key={feature.name}>
                <strong>{feature.label}</strong>
                <small>{feature.coef >= 0 ? 'Raises' : 'Lowers'} the match score (weight {feature.coef >= 0 ? '+' : ''}{feature.coef.toFixed(2)})</small>
              </li>
            ))}
          </ul>
        </section>
        <section className="portal-panel" aria-labelledby="rate-title">
          <h2 id="rate-title">Rate your last consultation</h2>
          <p className="panel-intro">Mon 26 Oct · Patient R.K. with Dr Bell</p>
          <StarRating label="Rate the patient" />
          <StarRating label="Rate the doctor" />
        </section>
      </div>

      <InterpreterEarnings data={data} interpreterId={me.id} />
    </div>
  )
}

function AvailabilityEditor({ data, interpreterId }: { data: PortalData; interpreterId: string }) {
  const interpreter = findInterpreter(interpreterId) ?? interpreterProfiles[0]
  const declared = declaredAvailability(data, interpreter)
  const booked = new Set(data.bookings
    .filter((booking) => (booking.interpreterId === interpreterId || booking.coInterpreterId === interpreterId) && !booking.noShow)
    .map((booking) => booking.slot))

  const toggle = (slot: string) => updatePortal((current) => {
    const list = declaredAvailability(current, interpreter)
    return {
      ...current,
      availability: { ...current.availability, [interpreterId]: list.includes(slot) ? list.filter((item) => item !== slot) : [...list, slot] },
    }
  })

  return (
    <section className="portal-panel" aria-labelledby="availability-title">
      <h2 id="availability-title"><CalendarCheck size={24} />Your availability</h2>
      <p className="panel-intro">Tell SignBridge when you can interpret ({interpreter.modes.join(' or ').toLowerCase()}). Patients are recommended you, and can book you, only at these times.</p>
      <div className="availability-grid">
        {demoDays.filter((day) => allSlots.some((slot) => splitSlot(slot).day === day)).map((day) => {
          const slots = allSlots.filter((slot) => splitSlot(slot).day === day)
          return (
            <div className="availability-day" key={day}>
              <h3>{day}</h3>
              {slots.map((slot) => {
                const isBooked = booked.has(slot)
                const on = isBooked || declared.includes(slot)
                const state = isBooked ? 'Booked' : on ? 'Available' : 'Not available'
                return (
                  <button
                    className={`availability-slot${isBooked ? ' booked' : ''}`}
                    aria-pressed={on}
                    aria-label={`${slot}: ${state}`}
                    disabled={isBooked}
                    onClick={() => toggle(slot)}
                    key={slot}
                  >
                    <strong>{splitSlot(slot).time}</strong><small>{state}</small>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function InterpretationWork({ data, task, me }: { data: PortalData; task: InterpretationTask; me: Party }) {
  const [text, setText] = useState('')
  const questionnaire = data.messages.find((message) => message.id === task.questionnaireId)
  const questions = questionnaire?.questions ?? []
  const patient = patientName(task.patientId)

  const send = () => {
    if (!text.trim()) return
    const message: PortalMessage = {
      id: newId(),
      from: me,
      to: partyFor('doctor', task.doctorId),
      kind: 'interpretation',
      subject: `Interpretation: ${patient} ${task.phase.toLowerCase()}`,
      body: text.trim(),
      createdAt: Date.now(),
    }
    updatePortal((current) => ({
      ...current,
      messages: [...current.messages, message],
      tasks: current.tasks.map((item) => item.id === task.id ? { ...item, status: 'sent' } : item),
    }))
  }

  return (
    <article className="questionnaire-card">
      <div className="message-head"><strong>{patient}</strong><span>for {doctorName(task.doctorId)}</span><span className="kind-chip kind-pre-deadline">{task.phase} · due {task.due}</span></div>
      <ol className="question-list">{questions.map((question) => <li key={question}>{question}</li>)}</ol>
      <div className="record-stage compact"><VideoCamera size={32} weight="duotone" /><p><strong>Simulated BSL recording, {Math.floor(task.videoSeconds / 60)} min {task.videoSeconds % 60} s.</strong> Earnings: {formatPounds(videoFee(task.videoSeconds).total)}. In a real service you would watch the patient’s video here.</p></div>
      <label className="input-block"><span>English interpretation for {doctorName(task.doctorId)}</span>
        <textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <button className="primary-button" disabled={!text.trim()} onClick={send}><PaperPlaneTilt size={20} />Send to {doctorName(task.doctorId)}</button>
    </article>
  )
}

function DoctorView({ data }: { data: PortalData }) {
  const [meId, setMeId] = useState(doctors[0].id)
  const me = findDoctor(meId) ?? doctors[0]
  const meParty = partyFor('doctor', me.id)
  const schedule = data.bookings.filter((booking) => booking.doctorId === me.id).sort(bySlot)

  const preConsultStatus = (patientId: string) => {
    const tasks = data.tasks.filter((task) => task.patientId === patientId && task.doctorId === me.id && task.phase === 'Pre-consultation')
    const typed = data.messages.some((message) => message.kind === 'answers' && message.from.id === patientId && message.to.id === me.id && message.phase === 'Pre-consultation')
    if (tasks.some((task) => task.status === 'sent')) return 'Interpreted'
    if (typed) return 'Answered by text'
    if (tasks.some((task) => task.status === 'awaiting')) return 'With interpreter'
    if (tasks.length > 0) return 'Finding interpreter'
    if (data.messages.some((message) => message.kind === 'questionnaire' && message.phase !== 'Post-consultation' && message.from.id === me.id && message.to.id === patientId)) return 'Awaiting patient'
    return 'Not sent'
  }

  const contacts = [...new Map([
    partyFor('patient', demoPatientId),
    ...schedule.map((booking) => partyFor('patient', booking.patientId)),
    ...schedule.filter((booking) => booking.interpreterId).map((booking) => partyFor('interpreter', booking.interpreterId as string)),
  ].map((party) => [party.id, party])).values()]

  return (
    <div className="portal-view">
      <header className="portal-heading role-doctor">
        <RoleAvatar role="doctor" />
        <div>
          <p>Doctor view · {me.specialty}</p>
          <label className="viewing-as"><span>Viewing as</span>
            <select value={me.id} onChange={(event) => setMeId(event.target.value)} aria-label="Viewing as doctor">
              {doctors.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.practice}</option>)}
            </select>
          </label>
        </div>
      </header>

      <section className="portal-panel" aria-labelledby="schedule-title">
        <h2 id="schedule-title">Schedule</h2>
        {schedule.length === 0 && <p className="panel-intro">No appointments booked yet.</p>}
        {schedule.length > 0 && (
          <div className="schedule-table" role="table" aria-label="Appointments">
            <div className="schedule-row schedule-head" role="row">
              <span role="columnheader">When</span><span role="columnheader">Patient</span><span role="columnheader">Interpreter</span><span role="columnheader">Mode</span><span role="columnheader">Pre-consultation</span>
            </div>
            {schedule.map((booking) => {
              const status = preConsultStatus(booking.patientId)
              return (
                <div className="schedule-row" role="row" key={booking.id}>
                  <span role="cell"><strong>{booking.slot}</strong></span>
                  <span role="cell">{patientName(booking.patientId)}</span>
                  <span role="cell">{booking.noShow ? 'No-show reported' : interpreterNames(booking) ? `${interpreterNames(booking)}${booking.pendingConfirmation ? ' (to confirm)' : ''}` : 'Patient choosing'}</span>
                  <span role="cell">{booking.mode === 'Online' ? <VideoCamera size={17} /> : <MapPin size={17} />}{booking.mode} · {durationLabel(booking.durationMinutes)}</span>
                  <span role="cell"><span className={`pre-status pre-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span></span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="portal-panel" aria-labelledby="doctor-messages-title">
        <h2 id="doctor-messages-title"><ChatCircleText size={24} />Messages{unreadCount(data, me.id) > 0 && <span className="tab-badge">{unreadCount(data, me.id)} unread</span>}</h2>
        <MessageCenter me={meParty} contacts={contacts} data={data} allowQuestionnaire key={me.id} />
      </section>

      <section className="portal-panel" aria-labelledby="doctor-feedback-title">
        <h2 id="doctor-feedback-title"><Star size={24} />Feedback</h2>
        <p className="panel-intro">Rate the interpreters on your appointments. Ratings feed future matches.</p>
        {schedule.every((booking) => !booking.interpreterId) && <p className="panel-intro">No interpreters to rate yet.</p>}
        {[...new Set(schedule.flatMap((booking) => [booking.interpreterId, booking.coInterpreterId]).filter((id): id is string => Boolean(id)))].map((id) => (
          <StarRating label={`Rate ${findInterpreter(id)?.name}`} key={`${me.id}-${id}`} />
        ))}
      </section>
    </div>
  )
}

interface EarningsJob {
  id: string
  slot: string
  kind: 'Live consultation' | 'Video translation'
  detail: string
  fee: Fee
  status: 'Booked' | 'To do' | 'Done'
}

function InterpreterEarnings({ data, interpreterId }: { data: PortalData; interpreterId: string }) {
  const jobs: EarningsJob[] = [
    ...data.bookings
      .filter((booking) => (booking.interpreterId === interpreterId || booking.coInterpreterId === interpreterId) && !booking.noShow && !booking.pendingConfirmation)
      .map((booking) => ({
        id: booking.id,
        slot: booking.slot,
        kind: 'Live consultation' as const,
        detail: `${patientName(booking.patientId)} with ${doctorName(booking.doctorId)} · ${booking.mode} · ${durationLabel(booking.durationMinutes)}`,
        fee: liveFee(booking.durationMinutes, booking.slot),
        status: 'Booked' as const,
      })),
    ...data.tasks
      .filter((task) => task.interpreterId === interpreterId && task.videoSeconds > 0)
      .map((task) => ({
        id: task.id,
        slot: task.due,
        kind: 'Video translation' as const,
        detail: `${patientName(task.patientId)} for ${doctorName(task.doctorId)} · ${Math.floor(task.videoSeconds / 60)} min ${task.videoSeconds % 60} s video`,
        fee: videoFee(task.videoSeconds),
        status: task.status === 'sent' ? 'Done' as const : 'To do' as const,
      })),
  ].sort((a, b) => slotOrder(a.slot) - slotOrder(b.slot))

  const inWeek = (job: EarningsJob) => currentWeekDays.includes(splitSlot(job.slot).day)
  const sum = (items: EarningsJob[]) => items.reduce((total, job) => total + job.fee.perInterpreter, 0)
  const thisWeek = jobs.filter(inWeek)
  const nextWeek = jobs.filter((job) => !inWeek(job))

  return (
    <section className="portal-panel earnings-panel" aria-labelledby="earnings-title">
      <h2 id="earnings-title">Earnings</h2>
      <p className="earnings-line">
        <strong>{formatPounds(sum(thisWeek))}</strong> expected this week (Mon 26 Oct to Sun 1 Nov)
        <span>·</span> {formatPounds(sum(thisWeek.filter((job) => job.status === 'Done')))} already earned
        <span>·</span> {formatPounds(sum(nextWeek))} booked next week
      </p>
      {thisWeek.length === 0 ? <p className="panel-intro">No paid work this week yet.</p> : (
        <details className="rate-card">
          <summary>Show breakdown</summary>
          <div className="table-scroll">
            <table className="earnings-table">
              <caption className="visually-hidden">This week’s jobs and earnings</caption>
              <thead><tr><th scope="col">When</th><th scope="col">Job</th><th scope="col">Breakdown</th><th scope="col">Status</th><th scope="col">Earnings</th></tr></thead>
              <tbody>
                {thisWeek.map((job) => (
                  <tr key={job.id}>
                    <td>{job.slot}</td>
                    <td><strong>{job.kind}</strong><small>{job.detail}</small></td>
                    <td>{job.fee.rule}</td>
                    <td><span className={`pre-status pre-${job.status === 'Done' ? 'interpreted' : job.status === 'To do' ? 'awaiting-patient' : 'with-interpreter'}`}>{job.status}</span></td>
                    <td className="money">{formatPounds(job.fee.perInterpreter)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><th scope="row" colSpan={4}>Expected this week</th><td className="money">{formatPounds(sum(thisWeek))}</td></tr></tfoot>
            </table>
          </div>
        </details>
      )}
      <details className="rate-card">
        <summary>Show rates</summary>
        <ul>
          <li><strong>Video translation:</strong> {formatPounds(rates.videoPerMinute)} per started video minute, minimum {formatPounds(rates.videoMinimum)} for clips under {rates.videoMinimumMinutes} minutes. Subtitles (.SRT) add {formatPounds(rates.subtitlesPerMinute)} a minute.</li>
          <li><strong>Live consultation, up to 1 hour:</strong> {formatPounds(rates.liveHourly)}, billed as a full hour even when shorter.</li>
          <li><strong>Over 1 hour:</strong> 2 interpreters are needed. {formatPounds(rates.extendedHourly)} an hour, shared between them, to prevent fatigue and repetitive strain.</li>
          <li><strong>Out of hours</strong> (weekends, 8 PM to 7 AM): live rates × {rates.outOfHoursMultiplier}.</li>
        </ul>
        <p className="retention-note"><ShieldCheck size={16} />Paid by the GP surgery or NHS trust that booked you, as the Equality Act 2010 requires. Patients are never charged.</p>
      </details>
    </section>
  )
}
