import {
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
  VideoCamera,
  WarningOctagon,
} from '@phosphor-icons/react'
import { useState } from 'react'
import {
  appointmentSlots,
  calendarDays,
  consultationNotes,
  doctorInbox,
  doctorSchedule,
  interpreterCalendar,
  interpreters,
  matchingFactors,
  patientQuestionnaire,
  recommendedTasks,
  roleLabels,
} from '../data/careJourney'
import type { CalendarItem, CalendarKind, PortalMessage, Role } from '../data/careJourney'
import { roleIcons } from './CareJourney'

export interface PortalState {
  questionnaireSent: boolean
  chosenInterpreterId: string | null
  messages: PortalMessage[]
}

export const initialPortalState: PortalState = {
  questionnaireSent: false,
  chosenInterpreterId: null,
  messages: doctorInbox,
}

const demoPatient = 'Alex Lewis'

interface RolePortalProps {
  role: Role
  state: PortalState
  onStateChange: (update: (state: PortalState) => PortalState) => void
  onSwitchRole: (role: Role) => void
  onStartConversation: () => void
}

export function RolePortal({ role, state, onStateChange, onSwitchRole, onStartConversation }: RolePortalProps) {
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
      <p className="portal-note"><ShieldCheck size={19} />Demonstration with fictional people. Nothing is sent or stored outside this page.</p>
      {role === 'patient' && <PatientView state={state} onStateChange={onStateChange} onStartConversation={onStartConversation} />}
      {role === 'interpreter' && <InterpreterView />}
      {role === 'doctor' && <DoctorView state={state} onStateChange={onStateChange} />}
    </section>
  )
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

type PatientTab = 'book' | 'interpreter' | 'messages' | 'notes'

function PatientView({ state, onStateChange, onStartConversation }: {
  state: PortalState
  onStateChange: RolePortalProps['onStateChange']
  onStartConversation: () => void
}) {
  const inbox = state.messages.filter((message) => message.to === demoPatient)
  const [tab, setTab] = useState<PatientTab>('book')
  const [slotId, setSlotId] = useState<string | null>(null)
  const [mode, setMode] = useState<'Online' | 'In person'>('Online')
  const [booked, setBooked] = useState<string | null>(null)
  const [answerMode, setAnswerMode] = useState<'record' | 'type'>('record')
  const [recording, setRecording] = useState<'idle' | 'recording' | 'saved'>('idle')
  const [answers, setAnswers] = useState(patientQuestionnaire.questions.map(() => ''))
  const [ticketRaised, setTicketRaised] = useState(false)
  const slot = appointmentSlots.find((item) => item.id === slotId)
  const chosen = interpreters.find((item) => item.id === state.chosenInterpreterId)
  const canSend = answerMode === 'record' ? recording === 'saved' : answers.every((answer) => answer.trim())

  return (
    <div className="portal-view">
      <header className="portal-heading role-patient">
        <RoleAvatar role="patient" />
        <div><p>Patient view</p><h1>Hello, {demoPatient}</h1></div>
      </header>
      <PortalTabs
        label="Patient sections"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'book', label: 'Book a slot' },
          { id: 'interpreter', label: 'Choose interpreter' },
          { id: 'messages', label: 'Messages', badge: state.questionnaireSent ? inbox.length : inbox.length + 1 },
          { id: 'notes', label: 'My notes' },
        ]}
      />

      {tab === 'book' && (
        <div className="portal-panel" role="tabpanel">
          <h2>Pick a time that suits you</h2>
          <p className="panel-intro">Only times when the surgery has an appointment <strong>and</strong> a BSL interpreter is free can be booked.</p>
          <div className="slot-grid">
            {appointmentSlots.map((item) => (
              <button
                className="slot-button"
                aria-pressed={slotId === item.id}
                disabled={item.interpretersFree === 0}
                onClick={() => setSlotId(item.id)}
                key={item.id}
              >
                <strong>{item.day}</strong>
                <span><Clock size={16} />{item.time}</span>
                <small>{item.interpretersFree === 0 ? 'No interpreter free' : `${item.interpretersFree} interpreter${item.interpretersFree > 1 ? 's' : ''} free`}</small>
              </button>
            ))}
          </div>
          <fieldset className="mode-choice">
            <legend>How would you like the interpreter to join?</legend>
            {(['Online', 'In person'] as const).map((item) => (
              <label key={item}>
                <input type="radio" name="mode" checked={mode === item} onChange={() => setMode(item)} />
                {item === 'Online' ? <VideoCamera size={20} /> : <MapPin size={20} />}{item === 'Online' ? 'Online video call' : 'In person at the surgery'}
              </label>
            ))}
          </fieldset>
          <button className="primary-button" disabled={!slot} onClick={() => { if (slot) setBooked(`${slot.day} at ${slot.time}, ${mode.toLowerCase()}`) }}>
            <CalendarCheck size={20} />Book this slot
          </button>
          {booked && <p className="portal-success" role="status"><CheckCircle size={20} weight="fill" />Booked for {booked}. Choose your interpreter on the day.</p>}
        </div>
      )}

      {tab === 'interpreter' && (
        <div className="portal-panel" role="tabpanel">
          <h2>Recommended interpreters for today</h2>
          <p className="panel-intro">Ranked by how well they have worked with patients who have a treatment history similar to yours.</p>
          <ol className="interpreter-list">
            {interpreters.map((item, index) => (
              <li className={state.chosenInterpreterId === item.id ? 'interpreter-card chosen' : 'interpreter-card'} key={item.id}>
                <span className="interpreter-rank">{index + 1}</span>
                <span className="interpreter-initials" aria-hidden="true">{item.initials}</span>
                <div className="interpreter-copy">
                  <strong>{item.name}</strong>
                  <small>{item.note}</small>
                  <div className="interpreter-stats">
                    <span><Star size={15} weight="fill" />{item.rating.toFixed(1)}</span>
                    <span>{item.similarCases} similar patients</span>
                    <span>{item.onTime}% on time</span>
                    <span>{item.modes.join(' · ')}</span>
                  </div>
                </div>
                <button
                  className={state.chosenInterpreterId === item.id ? 'primary-button small-button' : 'secondary-button small-button'}
                  onClick={() => onStateChange((current) => ({ ...current, chosenInterpreterId: item.id }))}
                >
                  {state.chosenInterpreterId === item.id ? <><CheckCircle size={18} weight="fill" />Chosen</> : `Choose ${item.name.split(' ')[0]}`}
                </button>
              </li>
            ))}
          </ol>
          <div className="no-show-box">
            <WarningOctagon size={26} weight="fill" />
            <div>
              <strong>Interpreter has not arrived?</strong>
              <p>Keep your appointment using speech-to-text captions and typed messages. The interpreter is moved to last priority for future matches.</p>
              <button className="secondary-button small-button" onClick={onStartConversation}><Keyboard size={18} />Continue with captions and text</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="portal-panel" role="tabpanel">
          <h2>Messages</h2>
          {!state.questionnaireSent ? (
            <article className="questionnaire-card">
              <div className="message-head"><EnvelopeSimple size={20} /><strong>{patientQuestionnaire.from}</strong><span className="kind-chip kind-questionnaire">Questionnaire</span></div>
              <h3>{patientQuestionnaire.subject}</h3>
              <ol className="question-list">{patientQuestionnaire.questions.map((question) => <li key={question}>{question}</li>)}</ol>
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
                  {patientQuestionnaire.questions.map((question, index) => (
                    <label className="input-block" key={question}>
                      <span>{question}</span>
                      <textarea rows={2} value={answers[index]} onChange={(event) => setAnswers(answers.map((answer, i) => i === index ? event.target.value : answer))} />
                    </label>
                  ))}
                </div>
              )}
              <button className="primary-button" disabled={!canSend} onClick={() => onStateChange((current) => ({ ...current, questionnaireSent: true }))}>
                <PaperPlaneTilt size={20} />Send answers
              </button>
            </article>
          ) : (
            <p className="portal-success" role="status"><CheckCircle size={20} weight="fill" />Answers sent. A matched BSL interpreter will pass them to Dr Bell before your appointment.</p>
          )}
          <MessageList messages={inbox} empty="No other messages." />
        </div>
      )}

      {tab === 'notes' && (
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
          {chosen && <p className="panel-intro">Today’s interpreter: <strong>{chosen.name}</strong></p>}
        </div>
      )}
    </div>
  )
}

const kindLabels: Record<CalendarKind, string> = {
  'pre-deadline': 'Pre-consult deadline',
  'post-deadline': 'Post-consult deadline',
  appointment: 'Consultation appointment',
}

function InterpreterView() {
  const [calendar, setCalendar] = useState<CalendarItem[]>(interpreterCalendar)
  const [taskStatus, setTaskStatus] = useState<Record<string, 'accepted' | 'declined'>>({})

  const acceptTask = (taskId: string) => {
    const task = recommendedTasks.find((item) => item.id === taskId)
    if (!task) return
    setCalendar((current) => [...current, { id: `task-${task.id}`, ...task.calendar }])
    setTaskStatus((current) => ({ ...current, [taskId]: 'accepted' }))
  }

  return (
    <div className="portal-view">
      <header className="portal-heading role-interpreter">
        <RoleAvatar role="interpreter" />
        <div><p>BSL interpreter view</p><h1>Amara Okafor</h1></div>
        <dl className="interpreter-summary">
          <div><dt>Rating</dt><dd>4.9</dd></div>
          <div><dt>On time</dt><dd>99%</dd></div>
          <div><dt>Match priority</dt><dd>Normal</dd></div>
        </dl>
      </header>

      <section className="portal-panel" aria-labelledby="calendar-title">
        <h2 id="calendar-title">This week</h2>
        <ul className="calendar-legend" aria-label="Calendar key">
          {(Object.keys(kindLabels) as CalendarKind[]).map((kind) => <li className={`kind-${kind}`} key={kind}>{kindLabels[kind]}</li>)}
        </ul>
        <div className="week-calendar">
          {calendarDays.map((day) => (
            <div className={day === 'Wed 28' ? 'calendar-day today' : 'calendar-day'} key={day}>
              <h3>{day}{day === 'Wed 28' && <small>Today</small>}</h3>
              {calendar.filter((item) => item.day === day).sort((a, b) => a.time.localeCompare(b.time)).map((item) => (
                <article className={`calendar-item kind-${item.kind}`} key={item.id}>
                  <time>{item.time}</time>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </article>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="portal-panel" aria-labelledby="tasks-title">
        <h2 id="tasks-title"><ListChecks size={24} />New tasks recommended for you</h2>
        <div className="task-list">
          {recommendedTasks.map((task) => (
            <article className="task-card" key={task.id}>
              <div className="task-top">
                <span className={`kind-chip kind-${task.kind === 'Consultation' ? 'appointment' : task.kind === 'Pre-consultation' ? 'pre-deadline' : 'post-deadline'}`}>{task.kind}</span>
                <span className="match-score">{task.score}% match</span>
              </div>
              <h3>{task.patient}</h3>
              <p className="task-meta"><Clock size={16} />{task.due} · {task.length}</p>
              <details>
                <summary>Why you were matched</summary>
                <ul>{task.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              </details>
              {taskStatus[task.id] ? (
                <p className="portal-success" role="status"><CheckCircle size={19} weight="fill" />{taskStatus[task.id] === 'accepted' ? 'Accepted and added to your calendar.' : 'Declined. Offered to the next interpreter.'}</p>
              ) : (
                <div className="compact-actions">
                  <button className="primary-button small-button" onClick={() => acceptTask(task.id)}>Accept</button>
                  <button className="text-button" onClick={() => setTaskStatus((current) => ({ ...current, [task.id]: 'declined' }))}>Decline</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <div className="portal-columns">
        <section className="portal-panel" aria-labelledby="matching-title">
          <h2 id="matching-title">How matching works</h2>
          <ul className="factor-list">
            {matchingFactors.map((factor) => <li key={factor.label}><strong>{factor.label}</strong><small>{factor.detail}</small></li>)}
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

function DoctorView({ state, onStateChange }: { state: PortalState; onStateChange: RolePortalProps['onStateChange'] }) {
  const chosen = interpreters.find((item) => item.id === state.chosenInterpreterId)
  const schedule = doctorSchedule.map((item) => item.patient === demoPatient
    ? { ...item, interpreter: chosen?.name ?? item.interpreter, preConsult: state.questionnaireSent ? 'With interpreter' as const : item.preConsult }
    : item)
  const contacts = [...schedule.map((item) => item.patient), ...new Set(schedule.map((item) => item.interpreter).filter((name) => name !== 'Not chosen yet'))]
  const inbox = state.messages.filter((message) => message.to === 'Dr Bell')
  const sent = state.messages.filter((message) => message.from === 'Dr Bell')
  const [openId, setOpenId] = useState<string | null>(inbox[0]?.id ?? null)
  const [to, setTo] = useState(contacts[0])
  const [kind, setKind] = useState<'message' | 'questionnaire'>('message')
  const [body, setBody] = useState('')
  const open = state.messages.find((message) => message.id === openId)

  const send = () => {
    if (!body.trim()) return
    const message: PortalMessage = {
      id: crypto.randomUUID(),
      from: 'Dr Bell',
      to,
      subject: kind === 'questionnaire' ? 'Questions before your appointment' : 'Message from Dr Bell',
      body: body.trim(),
      time: 'Just now',
      kind,
    }
    onStateChange((current) => ({ ...current, messages: [...current.messages, message] }))
    setBody('')
  }

  return (
    <div className="portal-view">
      <header className="portal-heading role-doctor">
        <RoleAvatar role="doctor" />
        <div><p>Doctor view</p><h1>Dr Bell · Riverside Surgery</h1></div>
      </header>

      <section className="portal-panel" aria-labelledby="schedule-title">
        <h2 id="schedule-title">Schedule · Thursday 29 October</h2>
        <div className="schedule-table" role="table" aria-label="Appointments">
          <div className="schedule-row schedule-head" role="row">
            <span role="columnheader">Time</span><span role="columnheader">Patient</span><span role="columnheader">Interpreter</span><span role="columnheader">Mode</span><span role="columnheader">Pre-consultation</span>
          </div>
          {schedule.map((item) => (
            <div className="schedule-row" role="row" key={item.id}>
              <span role="cell"><strong>{item.time}</strong></span>
              <span role="cell">{item.patient}</span>
              <span role="cell">{item.interpreter}</span>
              <span role="cell">{item.mode === 'Online' ? <VideoCamera size={17} /> : <MapPin size={17} />}{item.mode}</span>
              <span role="cell"><span className={`pre-status pre-${item.preConsult.toLowerCase().replaceAll(' ', '-')}`}>{item.preConsult}</span></span>
            </div>
          ))}
        </div>
      </section>

      <section className="portal-panel" aria-labelledby="doctor-messages-title">
        <h2 id="doctor-messages-title"><ChatCircleText size={24} />Messages</h2>
        <div className="message-box">
          <ul className="message-index" aria-label="Inbox">
            {inbox.map((message) => (
              <li key={message.id}>
                <button aria-pressed={openId === message.id} onClick={() => setOpenId(message.id)}>
                  <span className={`kind-chip kind-${message.kind}`}>{message.kind === 'interpretation' ? 'Interpretation' : 'Message'}</span>
                  <strong>{message.from}</strong>
                  <small>{message.subject} · {message.time}</small>
                </button>
              </li>
            ))}
          </ul>
          <div className="message-reader">
            {open ? (
              <article>
                <h3>{open.subject}</h3>
                <p className="task-meta">{open.from} · {open.time}</p>
                <p>{open.body}</p>
                {open.kind === 'interpretation' && <p className="retention-note"><ShieldCheck size={17} />Interpreted by a qualified BSL interpreter. Confirm anything unclear with the patient.</p>}
              </article>
            ) : <p className="panel-intro">Select a message.</p>}
          </div>
        </div>

        <div className="compose-box">
          <h3>New message</h3>
          <div className="compose-fields">
            <label className="input-block"><span>To</span><select value={to} onChange={(event) => setTo(event.target.value)}>{contacts.map((name) => <option key={name}>{name}</option>)}</select></label>
            <label className="input-block"><span>Type</span><select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}><option value="message">Message</option><option value="questionnaire">Questionnaire</option></select></label>
          </div>
          <label className="input-block"><span>Message</span><textarea rows={3} value={body} onChange={(event) => setBody(event.target.value)} placeholder={kind === 'questionnaire' ? 'One question per line' : 'Write a message'} /></label>
          {kind === 'questionnaire' && <p className="panel-intro">The patient answers in BSL or text. A matched interpreter returns an English interpretation within the agreed window.</p>}
          <button className="primary-button" disabled={!body.trim()} onClick={send}><PaperPlaneTilt size={20} />Send</button>
        </div>
        <MessageList messages={sent} empty="" title="Sent" />
      </section>
    </div>
  )
}

function MessageList({ messages, empty, title }: { messages: PortalMessage[]; empty: string; title?: string }) {
  if (messages.length === 0) return empty ? <p className="panel-intro">{empty}</p> : null
  return (
    <div className="message-list">
      {title && <h3>{title}</h3>}
      {messages.map((message) => (
        <article className="note-card" key={message.id}>
          <div className="message-head"><EnvelopeSimple size={20} /><strong>{message.from} → {message.to}</strong><span>{message.time}</span></div>
          <h4>{message.subject}</h4>
          <p>{message.body}</p>
        </article>
      ))}
    </div>
  )
}

function RoleAvatar({ role }: { role: Role }) {
  const RoleIcon = roleIcons[role]
  return <span className="role-avatar"><RoleIcon size={30} weight="duotone" /></span>
}
