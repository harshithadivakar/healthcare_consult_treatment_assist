import {
  ArrowCounterClockwise,
  Brain,
  CalendarCheck,
  ChatCircleText,
  CheckCircle,
  Clock,
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
import { useState } from 'react'
import { consultationNotes, roleLabels } from '../data/careJourney'
import type { Role } from '../data/careJourney'
import {
  demoDays,
  demoPatientId,
  doctors,
  findDoctor,
  findInterpreter,
  findPatient,
  interpreterProfiles,
  slotKey,
  slotOrder,
  splitSlot,
} from '../data/demoDirectory'
import type { Mode } from '../data/demoDirectory'
import { daysUntilDeleted, newId, resetPortal, updatePortal, usePortal } from '../data/portalStore'
import type { Booking, InterpretationTask, Party, PortalData, PortalMessage } from '../data/portalStore'
import { availableInterpreterCount, modelInfo, rankInterpreters } from '../lib/matching'
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

function MessageCenter({ me, contacts, data, allowQuestionnaire = false, hideQuestionnairesToMe = false }: {
  me: Party
  contacts: Party[]
  data: PortalData
  allowQuestionnaire?: boolean
  hideQuestionnairesToMe?: boolean
}) {
  const [toId, setToId] = useState(contacts[0]?.id ?? '')
  const [kind, setKind] = useState<'message' | 'questionnaire'>('message')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const to = contacts.find((contact) => contact.id === toId) ?? contacts[0]
  const canAsk = allowQuestionnaire && to?.role === 'patient'
  const messages = data.messages
    .filter((message) => message.to.id === me.id || message.from.id === me.id)
    .filter((message) => !(hideQuestionnairesToMe && message.kind === 'questionnaire' && message.to.id === me.id))
    .sort((a, b) => b.createdAt - a.createdAt)

  const send = () => {
    if (!to || !body.trim()) return
    const isQuestionnaire = canAsk && kind === 'questionnaire'
    const lines = body.split('\n').map((line) => line.trim()).filter(Boolean)
    const message: PortalMessage = {
      id: newId(),
      from: me,
      to,
      kind: isQuestionnaire ? 'questionnaire' : 'message',
      subject: subject.trim() || (isQuestionnaire ? 'Questions before your appointment' : `Message from ${me.name}`),
      body: isQuestionnaire ? 'Please answer these questions in BSL or text.' : body.trim(),
      questions: isQuestionnaire ? lines : undefined,
      createdAt: Date.now(),
    }
    updatePortal((current) => ({ ...current, messages: [...current.messages, message] }))
    setSubject('')
    setBody('')
  }

  return (
    <div className="message-center">
      <div className="compose-box">
        <h3>New message</h3>
        <div className="compose-fields">
          <label className="input-block"><span>To</span>
            <select value={to?.id} onChange={(event) => setToId(event.target.value)}>
              {contacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.name} ({roleLabels[contact.role].toLowerCase()})</option>)}
            </select>
          </label>
          {canAsk && (
            <label className="input-block"><span>Type</span>
              <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
                <option value="message">Message</option>
                <option value="questionnaire">Questionnaire</option>
              </select>
            </label>
          )}
        </div>
        <label className="input-block"><span>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Optional" /></label>
        <label className="input-block">
          <span>{canAsk && kind === 'questionnaire' ? 'Questions, one per line' : 'Message'}</span>
          <textarea rows={3} value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        {canAsk && kind === 'questionnaire' && <p className="panel-intro">The patient answers in BSL or text. The model assigns an interpreter, who returns an English interpretation to you.</p>}
        <button className="primary-button" disabled={!body.trim() || !to} onClick={send}><PaperPlaneTilt size={20} />Send</button>
      </div>

      <h3 className="message-list-title"><Tray size={20} />Inbox and sent</h3>
      {messages.length === 0 && <p className="panel-intro">No messages yet.</p>}
      <ul className="message-feed">
        {messages.map((message) => {
          const incoming = message.to.id === me.id
          return (
            <li className={`note-card ${incoming ? 'message-in' : 'message-out'}`} key={message.id}>
              <div className="message-head">
                <EnvelopeSimple size={18} />
                <strong>{incoming ? `From ${message.from.name}` : `To ${message.to.name}`}</strong>
                <span className={`kind-chip kind-${message.kind}`}>{message.kind === 'interpretation' ? 'Interpretation' : message.kind === 'questionnaire' ? 'Questionnaire' : 'Message'}</span>
                <span>{timeAgo(message.createdAt)}</span>
              </div>
              <h4>{message.subject}</h4>
              <p>{message.body}</p>
              {message.questions && <ol className="question-list">{message.questions.map((question) => <li key={question}>{question}</li>)}</ol>}
              <p className="retention-note"><Clock size={15} />Deleted in {daysUntilDeleted(message.createdAt)} days</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type PatientTab = 'book' | 'interpreter' | 'messages' | 'notes'

function PatientView({ data, onStartConversation }: { data: PortalData; onStartConversation: () => void }) {
  const me = partyFor('patient', demoPatientId)
  const [tab, setTab] = useState<PatientTab>('book')
  const [bookingId, setBookingId] = useState<string | null>(null)
  const myBookings = data.bookings.filter((booking) => booking.patientId === me.id).sort(bySlot)
  const openQuestionnaires = data.messages.filter((message) =>
    message.kind === 'questionnaire' && message.to.id === me.id && !data.tasks.some((task) => task.questionnaireId === message.id))

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
          { id: 'messages', label: 'Messages', badge: openQuestionnaires.length },
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
          <SentAnswers data={data} />
          <MessageCenter me={me} data={data} contacts={doctors.map((doctor) => partyFor('doctor', doctor.id))} hideQuestionnairesToMe />
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
  const [confirmation, setConfirmation] = useState('')
  const doctor = findDoctor(doctorId) ?? doctors[0]

  const book = () => {
    if (!slot) return
    const booking: Booking = { id: newId(), patientId: demoPatientId, doctorId, slot, mode, interpreterId: null, noShow: false, createdAt: Date.now() }
    updatePortal((current) => ({ ...current, bookings: [...current.bookings, booking] }))
    setConfirmation(`Booked with ${doctor.name} on ${slot}, ${mode.toLowerCase()}. It is now on ${doctor.name}’s schedule.`)
    setSlot(null)
  }

  return (
    <div className="portal-panel" role="tabpanel">
      <h2>Book an appointment</h2>
      <p className="panel-intro">Only times when the doctor has an appointment <strong>and</strong> a BSL interpreter is free can be booked.</p>
      <fieldset className="doctor-choice">
        <legend>Doctor</legend>
        {doctors.map((item) => (
          <label key={item.id}>
            <input type="radio" name="doctor" checked={doctorId === item.id} onChange={() => { setDoctorId(item.id); setSlot(null) }} />
            <span><strong>{item.name}</strong><small>{item.specialty} · {item.practice}</small></span>
          </label>
        ))}
      </fieldset>
      <fieldset className="mode-choice">
        <legend>How would you like the interpreter to join?</legend>
        {(['Online', 'In person'] as const).map((item) => (
          <label key={item}>
            <input type="radio" name="mode" checked={mode === item} onChange={() => { setMode(item); setSlot(null) }} />
            {item === 'Online' ? <VideoCamera size={20} /> : <MapPin size={20} />}{item === 'Online' ? 'Online video call' : 'In person at the surgery'}
          </label>
        ))}
      </fieldset>
      <div className="slot-grid">
        {doctor.slots.map((item) => {
          const taken = data.bookings.some((booking) => booking.doctorId === doctorId && booking.slot === item)
          const free = availableInterpreterCount(data, item, mode)
          const { day, time } = splitSlot(item)
          return (
            <button className="slot-button" aria-pressed={slot === item} disabled={taken || free === 0} onClick={() => setSlot(item)} key={item}>
              <strong>{day}</strong>
              <span><Clock size={16} />{time}</span>
              <small>{taken ? 'Already booked' : free === 0 ? 'No interpreter free' : `${free} interpreter${free > 1 ? 's' : ''} free`}</small>
            </button>
          )
        })}
      </div>
      <button className="primary-button" disabled={!slot} onClick={book}><CalendarCheck size={20} />Book appointment</button>
      {confirmation && <p className="portal-success" role="status"><CheckCircle size={20} weight="fill" />{confirmation}</p>}

      <h3 className="subsection-title">Your appointments</h3>
      {myBookings.length === 0 && <p className="panel-intro">No appointments yet.</p>}
      <ul className="booking-list">
        {myBookings.map((booking) => {
          const interpreter = findInterpreter(booking.interpreterId)
          return (
            <li key={booking.id}>
              <span className="booking-when"><strong>{booking.slot}</strong><small>{doctorName(booking.doctorId)} · {booking.mode}</small></span>
              {booking.noShow ? <span className="pre-status pre-awaiting-patient">Interpreter no-show reported</span>
                : interpreter ? <span className="pre-status pre-interpreted">Interpreter: {interpreter.name}</span>
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
  const matches = rankInterpreters(data, { patientId: booking.patientId, doctorId: booking.doctorId, slot: booking.slot, mode: booking.mode, bookingId: booking.id })

  const choose = (interpreterId: string) => updatePortal((current) => ({
    ...current,
    bookings: current.bookings.map((item) => item.id === booking.id ? { ...item, interpreterId } : item),
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
      <p className="panel-intro">For <strong>{booking.slot}</strong> with {doctorName(booking.doctorId)} ({findDoctor(booking.doctorId)?.specialty}), {booking.mode.toLowerCase()}.</p>
      <ModelNote />
      <ol className="interpreter-list">
        {matches.map((match, index) => {
          const chosen = booking.interpreterId === match.interpreter.id
          return (
            <li className={`interpreter-card${chosen ? ' chosen' : ''}${match.available ? '' : ' unavailable'}`} key={match.interpreter.id}>
              <span className="interpreter-rank">{index + 1}</span>
              <span className="interpreter-initials" aria-hidden="true">{match.interpreter.initials}</span>
              <div className="interpreter-copy">
                <strong>{match.interpreter.name}</strong>
                <span className="match-meter" aria-label={`${match.score}% predicted good session`}><span style={{ width: `${match.score}%` }} /></span>
                <small>{match.score}% predicted good session · {match.interpreter.region} BSL · {match.interpreter.modes.join(' or ')}</small>
                <ReasonChips match={match} />
                {match.penalised && <small className="flag-text"><WarningOctagon size={15} weight="fill" />Last priority: missed an appointment</small>}
                {!match.available && <small className="flag-text muted">Not available for this time or mode</small>}
              </div>
              <button
                className={chosen ? 'primary-button small-button' : 'secondary-button small-button'}
                disabled={!match.available}
                onClick={() => choose(match.interpreter.id)}
              >
                {chosen ? <><CheckCircle size={18} weight="fill" />Chosen</> : `Choose ${match.interpreter.name.split(' ')[0]}`}
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
  const [answerMode, setAnswerMode] = useState<'record' | 'type'>('record')
  const [recording, setRecording] = useState<'idle' | 'recording' | 'saved'>('idle')
  const [answers, setAnswers] = useState(questions.map(() => ''))
  const canSend = answerMode === 'record' ? recording === 'saved' : answers.every((answer) => answer.trim())

  const send = () => {
    const doctorId = questionnaire.from.id
    const [best] = rankInterpreters(data, { patientId: demoPatientId, doctorId }).filter((match) => !match.penalised)
    const appointment = data.bookings.filter((booking) => booking.patientId === demoPatientId && booking.doctorId === doctorId).sort(bySlot)[0]
    const task: InterpretationTask = {
      id: newId(),
      questionnaireId: questionnaire.id,
      patientId: demoPatientId,
      doctorId,
      interpreterId: best.interpreter.id,
      matchScore: best.score,
      answerMode,
      answers: answerMode === 'type' ? answers : [],
      due: appointment ? slotKey(splitSlot(appointment.slot).day, '08:00') : 'Fri 30 Oct 17:00',
      status: 'awaiting',
      createdAt: Date.now(),
    }
    updatePortal((current) => ({ ...current, tasks: [...current.tasks, task] }))
  }

  return (
    <article className="questionnaire-card">
      <div className="message-head"><EnvelopeSimple size={20} /><strong>{questionnaire.from.name}</strong><span className="kind-chip kind-questionnaire">Questionnaire</span><span>{timeAgo(questionnaire.createdAt)}</span></div>
      <h3>{questionnaire.subject}</h3>
      <ol className="question-list">{questions.map((question) => <li key={question}>{question}</li>)}</ol>
      <div className="answer-mode" role="radiogroup" aria-label="How do you want to answer?">
        <button role="radio" aria-checked={answerMode === 'record'} onClick={() => setAnswerMode('record')}><VideoCamera size={20} />Record in BSL</button>
        <button role="radio" aria-checked={answerMode === 'type'} onClick={() => setAnswerMode('type')}><Keyboard size={20} />Type answers</button>
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
      <button className="primary-button" disabled={!canSend} onClick={send}><PaperPlaneTilt size={20} />Send answers</button>
    </article>
  )
}

function SentAnswers({ data }: { data: PortalData }) {
  const tasks = data.tasks.filter((task) => task.patientId === demoPatientId).sort((a, b) => b.createdAt - a.createdAt)
  return (
    <>
      {tasks.map((task) => (
        <p className="portal-success" role="status" key={task.id}>
          <CheckCircle size={20} weight="fill" />
          {task.status === 'sent'
            ? `${findInterpreter(task.interpreterId)?.name} has sent the interpretation of your answers to ${doctorName(task.doctorId)}.`
            : `Answers sent. ${findInterpreter(task.interpreterId)?.name} (${task.matchScore}% match) will interpret them for ${doctorName(task.doctorId)} by ${task.due}.`}
        </p>
      ))}
    </>
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
  const [declined, setDeclined] = useState<string[]>([])
  const me = findInterpreter(meId) ?? interpreterProfiles[0]
  const meParty = partyFor('interpreter', me.id)
  const myBookings = data.bookings.filter((booking) => booking.interpreterId === me.id && !booking.noShow)
  const myTasks = data.tasks.filter((task) => task.interpreterId === me.id)
  const penalised = (data.reportedNoShows[me.id] ?? 0) > 0

  const calendar = [
    ...myBookings.map((booking) => ({
      id: booking.id, slot: booking.slot, kind: 'appointment' as CalendarKind,
      title: `Consultation · ${booking.mode}`, detail: `${patientName(booking.patientId)} with ${doctorName(booking.doctorId)}`,
    })),
    ...myTasks.filter((task) => task.status === 'awaiting').map((task) => ({
      id: task.id, slot: task.due, kind: 'deadline' as CalendarKind,
      title: 'Pre-consult due', detail: `${patientName(task.patientId)} for ${doctorName(task.doctorId)}`,
    })),
  ]

  const recommended = data.bookings
    .filter((booking) => !booking.interpreterId && !booking.noShow && !declined.includes(booking.id))
    .map((booking) => {
      const ranked = rankInterpreters(data, { patientId: booking.patientId, doctorId: booking.doctorId, slot: booking.slot, mode: booking.mode })
      const available = ranked.filter((match) => match.available)
      const position = available.findIndex((match) => match.interpreter.id === me.id)
      return { booking, match: available[position], position }
    })
    .filter((item) => item.position >= 0 && item.position < 3)
    .sort((a, b) => bySlot(a.booking, b.booking))

  const accept = (bookingId: string) => updatePortal((current) => ({
    ...current,
    bookings: current.bookings.map((item) => item.id === bookingId && !item.interpreterId ? { ...item, interpreterId: me.id } : item),
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

      <section className="portal-panel" aria-labelledby="inbox-title">
        <h2 id="inbox-title"><Tray size={24} />Interpretations to do</h2>
        {myTasks.filter((task) => task.status === 'awaiting').length === 0 && <p className="panel-intro">Nothing waiting. New answers from patients appear here.</p>}
        {myTasks.filter((task) => task.status === 'awaiting').map((task) => <InterpretationWork data={data} task={task} me={meParty} key={task.id} />)}
      </section>

      <section className="portal-panel" aria-labelledby="tasks-title">
        <h2 id="tasks-title"><ListChecks size={24} />New appointments recommended for you</h2>
        <p className="panel-intro">Appointments still without an interpreter where the model ranks you in the top three.</p>
        {recommended.length === 0 && <p className="panel-intro">No open recommendations right now.</p>}
        <div className="task-list">
          {recommended.map(({ booking, match, position }) => (
            <article className="task-card" key={booking.id}>
              <div className="task-top">
                <span className="kind-chip kind-appointment">Consultation · {booking.mode}</span>
                <span className="match-score">{match.score}% match · #{position + 1}</span>
              </div>
              <h3>{patientName(booking.patientId)} · {findDoctor(booking.doctorId)?.specialty}</h3>
              <p className="task-meta"><Clock size={16} />{booking.slot} with {doctorName(booking.doctorId)}</p>
              <details>
                <summary>Why you were matched</summary>
                <ReasonChips match={match} limit={4} />
              </details>
              <div className="compact-actions">
                <button className="primary-button small-button" onClick={() => accept(booking.id)}>Accept</button>
                <button className="text-button" onClick={() => setDeclined([...declined, booking.id])}>Decline</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="portal-panel" aria-labelledby="interpreter-messages-title">
        <h2 id="interpreter-messages-title"><ChatCircleText size={24} />Messages</h2>
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
    </div>
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
      subject: `Interpretation: ${patient} pre-consultation`,
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
      <div className="message-head"><strong>{patient}</strong><span>for {doctorName(task.doctorId)}</span><span className="kind-chip kind-pre-deadline">Due {task.due}</span><span className="match-score">{task.matchScore}% match</span></div>
      {task.answerMode === 'record' ? (
        <div className="record-stage compact"><VideoCamera size={32} weight="duotone" /><p><strong>Simulated BSL recording, 1 min 12 s.</strong> In a real service you would watch the patient’s video here.</p></div>
      ) : (
        <dl className="answer-list">
          {questions.map((question, index) => <div key={question}><dt>{question}</dt><dd>{task.answers[index] || 'No answer'}</dd></div>)}
        </dl>
      )}
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
    const tasks = data.tasks.filter((task) => task.patientId === patientId && task.doctorId === me.id)
    if (tasks.some((task) => task.status === 'sent')) return 'Interpreted'
    if (tasks.length > 0) return 'With interpreter'
    if (data.messages.some((message) => message.kind === 'questionnaire' && message.from.id === me.id && message.to.id === patientId)) return 'Awaiting patient'
    return 'Not sent'
  }

  const contacts = [...new Map([
    ...schedule.map((booking) => partyFor('patient', booking.patientId)),
    partyFor('patient', demoPatientId),
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
                  <span role="cell">{booking.noShow ? 'No-show reported' : findInterpreter(booking.interpreterId)?.name ?? 'Patient choosing'}</span>
                  <span role="cell">{booking.mode === 'Online' ? <VideoCamera size={17} /> : <MapPin size={17} />}{booking.mode}</span>
                  <span role="cell"><span className={`pre-status pre-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span></span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="portal-panel" aria-labelledby="doctor-messages-title">
        <h2 id="doctor-messages-title"><ChatCircleText size={24} />Messages</h2>
        <MessageCenter me={meParty} contacts={contacts} data={data} allowQuestionnaire key={me.id} />
      </section>
    </div>
  )
}
