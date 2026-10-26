import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  BellRinging,
  BookOpenText,
  CalendarCheck,
  CalendarBlank,
  Camera,
  ChatCircleText,
  Check,
  CheckCircle,
  ClipboardText,
  Ear,
  FirstAid,
  HandPalm,
  Heartbeat,
  Keyboard,
  MagnifyingGlass,
  Microphone,
  MicrophoneSlash,
  Moon,
  PencilSimple,
  PersonArmsSpread,
  PhoneCall,
  Play,
  Repeat,
  ShieldCheck,
  SignOut,
  Siren,
  SlidersHorizontal,
  Stethoscope,
  TextAa,
  Trash,
  Warning,
  WarningOctagon,
  WifiHigh,
  WifiSlash,
  X,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal } from './components/Modal'
import { StatusBadge } from './components/StatusBadge'
import { formatClipTime, getBslClipEmbedUrl, getBslVideoReference } from './data/bslVideos'
import { medicalPhrases, phraseCategories } from './data/phrases'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import type {
  ConversationMessage,
  Journey,
  MedicalPhrase,
  MessageStatus,
  Preferences,
  SymptomSummary,
} from './types'

type Screen = 'onboarding' | 'journey' | 'conversation' | 'privacy'
type ModalName = 'interpreter' | 'erase' | 'phrase-library' | 'symptoms' | 'camera' | 'bsl-video' | 'settings' | null

const defaultPreferences: Preferences = {
  bsl: true,
  captions: true,
  typed: true,
  largeText: false,
  highContrast: false,
  darkMode: false,
}

const journeys: Array<{ name: Journey; description: string; icon: typeof CalendarBlank }> = [
  { name: 'Reception', description: 'Check in, confirm an appointment and choose communication support.', icon: CalendarBlank },
  { name: 'Consultation', description: 'Share symptoms, ask questions and confirm understanding.', icon: Stethoscope },
  { name: 'Emergency', description: 'Support urgent communication while normal emergency procedures continue.', icon: Siren },
]

const symptomButtons = ['Head', 'Chest', 'Stomach', 'Back', 'Arm', 'Leg', 'Throat', 'Other']
const painTypes = ['Sharp', 'Dull', 'Burning', 'Throbbing', 'Cramping', 'Not sure']
const associatedSymptoms = ['Breathlessness', 'Dizziness', 'Fever', 'Nausea', 'Bleeding', 'Weakness']

function nowLabel() {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date())
}

function createMessage(
  sender: ConversationMessage['sender'],
  text: string,
  status: MessageStatus,
  source: ConversationMessage['source'],
  phraseId?: string,
): ConversationMessage {
  return { id: crypto.randomUUID(), sender, text, status, timestamp: nowLabel(), source, phraseId }
}

function findCuratedPhrase(text: string, phraseId?: string | null) {
  const normalisedText = text.trim().toLocaleLowerCase('en-GB')
  return medicalPhrases.find((phrase) =>
    phrase.id === phraseId || phrase.text.toLocaleLowerCase('en-GB') === normalisedText,
  )
}

function App() {
  const [screen, setScreen] = useState<Screen>('onboarding')
  const [modal, setModal] = useState<ModalName>(null)
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [journey, setJourney] = useState<Journey | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [draft, setDraft] = useState('')
  const [draftSource, setDraftSource] = useState<ConversationMessage['source']>('typed')
  const [selectedPhraseId, setSelectedPhraseId] = useState<string | null>(null)
  const [bslPhraseId, setBslPhraseId] = useState<string | null>(null)
  const [patientReply, setPatientReply] = useState('')
  const [editMessageId, setEditMessageId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [toast, setToast] = useState('')

  useEffect(() => {
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    document.documentElement.dataset.contrast = preferences.highContrast ? 'high' : 'standard'
    document.documentElement.dataset.textSize = preferences.largeText ? 'large' : 'standard'
    document.documentElement.dataset.theme = preferences.darkMode ? 'dark' : 'light'
  }, [preferences.darkMode, preferences.highContrast, preferences.largeText])

  const updateDraftFromVoice = useCallback((text: string) => {
    setDraft(text)
    setDraftSource('voice')
    setSelectedPhraseId(null)
  }, [])
  const speech = useSpeechRecognition(updateDraftFromVoice)

  const latestProfessional = useMemo(
    () => [...messages].reverse().find((message) => message.sender === 'professional'),
    [messages],
  )
  const draftBslPhrase = useMemo(() => {
    const phrase = findCuratedPhrase(draft, selectedPhraseId)
    return phrase?.bslVideoId && phrase.bslClipStart !== undefined && phrase.bslClipEnd !== undefined ? phrase : undefined
  }, [draft, selectedPhraseId])

  const chooseJourney = (selection: Journey) => {
    setJourney(selection)
    setMessages([
      createMessage(
        'professional',
        selection === 'Reception'
          ? 'Hello. How would you prefer to communicate today?'
          : selection === 'Consultation'
            ? 'Hello. Please tell me what you would like help with today.'
            : 'We will use this screen to support communication. Emergency procedures must continue as normal.',
        selection === 'Emergency' ? 'Needs confirmation' : 'Confirmed',
        'phrase',
      ),
    ])
    setScreen('conversation')
  }

  const sendProfessionalMessage = () => {
    const text = draft.trim()
    if (!text) return
    const matchingPhrase = findCuratedPhrase(text, selectedPhraseId)
    setMessages((current) => [...current, createMessage(
      'professional',
      text,
      'Needs confirmation',
      matchingPhrase ? 'phrase' : draftSource,
      matchingPhrase?.id,
    )])
    setDraft('')
    setDraftSource('typed')
    setSelectedPhraseId(null)
    setToast('Message shown to the patient. Confirmation is needed.')
  }

  const sendPatientReply = (source: ConversationMessage['source'] = 'typed', textOverride?: string) => {
    const text = (textOverride ?? patientReply).trim()
    if (!text) return
    setMessages((current) => [...current, createMessage('patient', text, 'Confirmed', source)])
    setPatientReply('')
    setToast('Patient response added to this session.')
  }

  const updateMessage = (id: string, updates: Partial<ConversationMessage>) => {
    setMessages((current) => current.map((message) => message.id === id ? { ...message, ...updates } : message))
  }

  const removeMessage = (id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id))
    setToast('Message removed from the session.')
  }

  const choosePhrase = (phrase: MedicalPhrase) => {
    setDraft(phrase.text)
    setDraftSource('phrase')
    setSelectedPhraseId(phrase.id)
    setModal(null)
    if (phrase.interpreterRecommended) {
      setToast('This phrase is high risk. Qualified communication support is recommended.')
    }
  }

  const saveEdit = () => {
    if (!editMessageId || !editText.trim()) return
    const matchingPhrase = findCuratedPhrase(editText)
    updateMessage(editMessageId, {
      text: editText.trim(),
      status: 'Needs confirmation',
      source: matchingPhrase ? 'phrase' : 'typed',
      phraseId: matchingPhrase?.id,
    })
    setEditMessageId(null)
    setEditText('')
    setToast('Message corrected. Patient confirmation is needed again.')
  }

  const repeatLatest = () => {
    if (!latestProfessional) return
    setMessages((current) => [...current, createMessage(
      'professional',
      latestProfessional.text,
      'Needs confirmation',
      latestProfessional.source,
      latestProfessional.phraseId,
    )])
    setToast('Message repeated.')
  }

  const eraseSession = () => {
    setMessages([])
    setDraft('')
    setSelectedPhraseId(null)
    setBslPhraseId(null)
    setPatientReply('')
    setJourney(null)
    setModal(null)
    setScreen('onboarding')
    setToast('Session ended. All conversation data was erased from memory.')
  }

  const submitSymptoms = (summary: SymptomSummary) => {
    const details = [
      `Body area: ${summary.bodyArea || 'Not selected'}`,
      `Pain: ${summary.pain}/10`,
      `Type: ${summary.painType || 'Not selected'}`,
      `Duration: ${summary.duration || 'Not entered'}`,
      `Associated symptoms: ${summary.associated.join(', ') || 'None selected'}`,
      `Allergies: ${summary.allergies || 'Not entered'}`,
      `Possible pregnancy: ${summary.pregnancy || 'Not answered'}`,
      `Immediate help requested: ${summary.urgent ? 'Yes' : 'No'}`,
    ].join('. ')
    sendPatientReply('symptom tool', details)
    setModal(null)
  }

  const hasSession = screen === 'conversation' || messages.length > 0

  return (
    <div className="app-shell">
      <Header
        screen={screen}
        journey={journey}
        isOnline={isOnline}
        hasSession={hasSession}
        onBack={() => setScreen(screen === 'conversation' ? 'journey' : 'onboarding')}
        onPrivacy={() => setScreen('privacy')}
        onSettings={() => setModal('settings')}
        onErase={() => setModal('erase')}
      />

      <main id="main-content" tabIndex={-1}>
        {screen === 'onboarding' && (
          <Onboarding
            preferences={preferences}
            onChange={setPreferences}
            onContinue={() => setScreen('journey')}
          />
        )}
        {screen === 'journey' && <JourneySelection onChoose={chooseJourney} />}
        {screen === 'conversation' && journey && (
          <Conversation
            journey={journey}
            messages={messages}
            draft={draft}
            patientReply={patientReply}
            latestProfessional={latestProfessional}
            speech={speech}
            editMessageId={editMessageId}
            editText={editText}
            draftBslPhrase={draftBslPhrase}
            onDraftChange={(value) => { setDraft(value); setDraftSource('typed'); setSelectedPhraseId(null) }}
            onPatientReplyChange={setPatientReply}
            onSendProfessional={sendProfessionalMessage}
            onSendPatient={() => sendPatientReply()}
            onOpenPhraseLibrary={() => setModal('phrase-library')}
            onOpenSymptoms={() => setModal('symptoms')}
            onOpenCamera={() => setModal('camera')}
            onOpenBslVideo={() => {
              setBslPhraseId(findCuratedPhrase(latestProfessional?.text ?? '', latestProfessional?.phraseId)?.id ?? null)
              setModal('bsl-video')
            }}
            onPreviewDraft={() => {
              setBslPhraseId(draftBslPhrase?.id ?? null)
              setModal('bsl-video')
            }}
            onConfirm={(id) => updateMessage(id, { status: 'Confirmed' })}
            onUnsafe={(id) => updateMessage(id, { status: 'Unable to translate safely' })}
            onRepeat={repeatLatest}
            onRemove={removeMessage}
            onStartEdit={(message) => { setEditMessageId(message.id); setEditText(message.text) }}
            onEditText={setEditText}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditMessageId(null)}
          />
        )}
        {screen === 'privacy' && <PrivacyPage onBack={() => setScreen(hasSession ? 'conversation' : 'onboarding')} />}
      </main>

      <button className="interpreter-fab" onClick={() => setModal('interpreter')}>
        <PhoneCall size={24} weight="bold" />
        <span>Request a qualified BSL interpreter</span>
      </button>

      {toast && <div className="toast" role="status"><CheckCircle size={22} weight="fill" />{toast}</div>}

      {modal === 'interpreter' && <InterpreterModal onClose={() => setModal(null)} />}
      {modal === 'erase' && <EraseModal onClose={() => setModal(null)} onErase={eraseSession} />}
      {modal === 'phrase-library' && (
        <PhraseLibrary
          onClose={() => setModal(null)}
          onChoose={choosePhrase}
          onPreview={(phrase) => { setBslPhraseId(phrase.id); setModal('bsl-video') }}
        />
      )}
      {modal === 'symptoms' && <SymptomTool onClose={() => setModal(null)} onSubmit={submitSymptoms} />}
      {modal === 'camera' && <CameraSimulation onClose={() => setModal(null)} onUse={(text) => { sendPatientReply('camera simulation', text); setModal(null) }} />}
      {modal === 'bsl-video' && (
        <BslVideoExperience
          message={latestProfessional}
          phraseId={bslPhraseId}
          isOnline={isOnline}
          onClose={() => setModal(null)}
          onInterpreter={() => setModal('interpreter')}
        />
      )}
      {modal === 'settings' && (
        <SettingsModal preferences={preferences} onChange={setPreferences} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

interface HeaderProps {
  screen: Screen
  journey: Journey | null
  isOnline: boolean
  hasSession: boolean
  onBack: () => void
  onPrivacy: () => void
  onSettings: () => void
  onErase: () => void
}

function Header({ screen, journey, isOnline, hasSession, onBack, onPrivacy, onSettings, onErase }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="topbar-primary">
        {screen !== 'onboarding' && (
          <button className="icon-button topbar-back" onClick={onBack} aria-label="Go back">
            <ArrowLeft size={24} weight="bold" />
          </button>
        )}
        <button className="brand" onClick={() => window.location.reload()} aria-label="Reload SignBridge and erase session">
          <span className="brand-mark"><ChatCircleText size={26} weight="fill" /></span>
          <span><strong>SignBridge</strong><small>Student prototype</small></span>
        </button>
        {journey && screen === 'conversation' && <span className="journey-label">{journey}</span>}
      </div>
      <nav className="topbar-actions" aria-label="Utility navigation">
        <span className="network-status" aria-live="polite">
          {isOnline ? <WifiHigh size={20} /> : <WifiSlash size={20} />}
          {isOnline ? 'Online' : 'Offline mode'}
        </span>
        <button className="utility-button" onClick={onPrivacy}><ShieldCheck size={20} />Privacy</button>
        <button className="utility-button" onClick={onSettings}><SlidersHorizontal size={20} />Display</button>
        {hasSession && <button className="utility-button utility-danger" onClick={onErase}><SignOut size={20} />End session</button>}
      </nav>
    </header>
  )
}

function Onboarding({ preferences, onChange, onContinue }: {
  preferences: Preferences
  onChange: (preferences: Preferences) => void
  onContinue: () => void
}) {
  const options: Array<{ key: keyof Preferences; label: string; detail: string; icon: typeof HandPalm }> = [
    { key: 'bsl', label: 'British Sign Language', detail: 'Show attributed BSL video excerpts for curated phrases.', icon: HandPalm },
    { key: 'captions', label: 'Live captions', detail: 'Show spoken words as editable text when the browser supports it.', icon: Ear },
    { key: 'typed', label: 'Typed conversation', detail: 'Keep the keyboard available on both sides of the conversation.', icon: Keyboard },
    { key: 'largeText', label: 'Large text', detail: 'Increase text size throughout the application.', icon: TextAa },
    { key: 'highContrast', label: 'High contrast', detail: 'Use stronger borders and colour contrast.', icon: PersonArmsSpread },
  ]

  return (
    <section className="onboarding page-frame">
      <div className="onboarding-intro">
        <span className="prototype-kicker">Accessible conversation support</span>
        <h1>How would you like to communicate?</h1>
        <p>Choose any options that help. You can change them during this demonstration.</p>
        <div className="safety-notice" role="note">
          <WarningOctagon size={26} weight="fill" />
          <p><strong>Student prototype</strong><br />Not for diagnosis, consent, medication decisions or clinical use.</p>
        </div>
      </div>
      <div className="preference-panel" aria-labelledby="preference-heading">
        <h2 id="preference-heading">Communication preferences</h2>
        <div className="preference-list">
          {options.map(({ key, label, detail, icon: Icon }) => (
            <label className="preference-option" key={key}>
              <span className="preference-icon"><Icon size={27} weight="duotone" /></span>
              <span className="preference-copy"><strong>{label}</strong><small>{detail}</small></span>
              <input
                type="checkbox"
                checked={preferences[key]}
                onChange={(event) => onChange({ ...preferences, [key]: event.target.checked })}
              />
              <span className="toggle" aria-hidden="true"><span /></span>
            </label>
          ))}
        </div>
        <button className="primary-button continue-button" onClick={onContinue}>
          Continue <ArrowRight size={22} weight="bold" />
        </button>
      </div>
    </section>
  )
}

function JourneySelection({ onChoose }: { onChoose: (journey: Journey) => void }) {
  return (
    <section className="journey-page page-frame">
      <header className="page-heading">
        <h1>Where are you today?</h1>
        <p>Choose a demonstration pathway. No information leaves this device.</p>
      </header>
      <div className="journey-grid">
        {journeys.map(({ name, description, icon: Icon }) => (
          <button className={`journey-card journey-${name.toLowerCase()}`} onClick={() => onChoose(name)} key={name}>
            <span className="journey-icon"><Icon size={38} weight="duotone" /></span>
            <span className="journey-content"><strong>{name}</strong><small>{description}</small></span>
            <ArrowRight className="journey-arrow" size={26} weight="bold" />
            {name === 'Emergency' && (
              <span className="emergency-note"><Warning size={19} weight="fill" />This does not replace emergency procedures or a qualified interpreter.</span>
            )}
          </button>
        ))}
      </div>
      <p className="session-note"><Trash size={20} />Conversation data is held in memory only and erased when the page reloads.</p>
    </section>
  )
}

interface ConversationProps {
  journey: Journey
  messages: ConversationMessage[]
  draft: string
  patientReply: string
  latestProfessional?: ConversationMessage
  speech: ReturnType<typeof useSpeechRecognition>
  editMessageId: string | null
  editText: string
  draftBslPhrase?: MedicalPhrase
  onDraftChange: (value: string) => void
  onPatientReplyChange: (value: string) => void
  onSendProfessional: () => void
  onSendPatient: () => void
  onOpenPhraseLibrary: () => void
  onOpenSymptoms: () => void
  onOpenCamera: () => void
  onOpenBslVideo: () => void
  onPreviewDraft: () => void
  onConfirm: (id: string) => void
  onUnsafe: (id: string) => void
  onRepeat: () => void
  onRemove: (id: string) => void
  onStartEdit: (message: ConversationMessage) => void
  onEditText: (value: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
}

function Conversation(props: ConversationProps) {
  const {
    journey, messages, draft, patientReply, latestProfessional, speech, editMessageId, editText, draftBslPhrase,
    onDraftChange, onPatientReplyChange, onSendProfessional, onSendPatient, onOpenPhraseLibrary,
    onOpenSymptoms, onOpenCamera, onOpenBslVideo, onPreviewDraft, onConfirm, onUnsafe, onRepeat, onRemove,
    onStartEdit, onEditText, onSaveEdit, onCancelEdit,
  } = props
  const [showHistory, setShowHistory] = useState(false)

  return (
    <section className="conversation-page">
      {journey === 'Emergency' && (
        <div className="emergency-banner" role="alert">
          <Siren size={24} weight="fill" />
          <span><strong>Emergency demonstration only.</strong> Continue normal emergency procedures and use qualified communication support.</span>
        </div>
      )}
      <div className="conversation-grid">
        <section className="conversation-panel professional-panel" aria-labelledby="professional-title">
          <header className="panel-heading">
            <span className="role-icon"><Stethoscope size={26} weight="duotone" /></span>
            <div><p>Healthcare professional</p><h1 id="professional-title">Prepare a message</h1></div>
          </header>

          <div className="input-block">
            <label htmlFor="professional-message">Message in plain English</label>
            <textarea
              id="professional-message"
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Type or dictate a message. Review it before sending."
              rows={5}
            />
            <div className="character-row"><span>{draft.length} characters</span><span>Editable before sending</span></div>
          </div>

          {speech.error && <p className="inline-error" role="alert"><Warning size={19} />{speech.error}</p>}
          {!speech.supported && (
            <p className="feature-note"><MicrophoneSlash size={20} />Voice input is not available in this browser. Typed messages always work.</p>
          )}

          <div className="compose-actions">
            <button className="secondary-button" onClick={speech.toggle} disabled={!speech.supported} aria-pressed={speech.isListening}>
              {speech.isListening ? <MicrophoneSlash size={21} /> : <Microphone size={21} />}
              {speech.isListening ? 'Stop listening' : 'Use microphone'}
            </button>
            <button className="secondary-button" onClick={onOpenPhraseLibrary}>
              <BookOpenText size={21} />Medical phrases
            </button>
          </div>
          {speech.isListening && <div className="listening-state" role="status"><span className="listening-bars" aria-hidden="true"><i /><i /><i /></span>Listening. Check the text before sending.</div>}
          {draftBslPhrase && (
            <button className="bsl-draft-preview" onClick={onPreviewDraft}>
              <HandPalm size={22} weight="duotone" />
              <span><strong>Preview BSL video excerpt</strong><small>Educational source · confirmation required</small></span>
              <Play size={20} weight="fill" />
            </button>
          )}
          <button className="primary-button send-button" onClick={onSendProfessional} disabled={!draft.trim()}>
            Show to patient <ArrowRight size={22} weight="bold" />
          </button>

          <div className="professional-guidance">
            <ShieldCheck size={22} weight="duotone" />
            <p><strong>Keep control of the message.</strong> Voice text can be wrong. Correct it first, then wait for patient confirmation.</p>
          </div>
        </section>

        <section className="conversation-panel patient-panel" aria-labelledby="patient-title">
          <header className="panel-heading patient-heading">
            <span className="role-icon"><HandPalm size={26} weight="duotone" /></span>
            <div><p>Patient</p><h1 id="patient-title">Message to understand</h1></div>
          </header>

          {latestProfessional ? (
            <article className="patient-message">
              <div className="message-meta"><StatusBadge status={latestProfessional.status} /><time>{latestProfessional.timestamp}</time></div>
              {editMessageId === latestProfessional.id ? (
                <div className="edit-message-block">
                  <label htmlFor="edit-message">Correct this message</label>
                  <textarea id="edit-message" value={editText} onChange={(event) => onEditText(event.target.value)} rows={4} />
                  <div className="compact-actions">
                    <button className="primary-button small-button" onClick={onSaveEdit}><Check size={19} />Save correction</button>
                    <button className="text-button" onClick={onCancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="message-text">{latestProfessional.text}</p>
              )}

              <button className="bsl-placeholder-button" onClick={onOpenBslVideo}>
                <span className="bsl-placeholder-icon"><HandPalm size={34} weight="duotone" /></span>
                <span><strong>Open BSL video excerpt</strong><small>Attributed University of Edinburgh learning source.</small></span>
                <ArrowRight size={22} />
              </button>

              <div className="understanding-actions" aria-label="Patient understanding">
                <button className="response-button response-confirm" onClick={() => onConfirm(latestProfessional.id)}><CheckCircle size={24} weight="fill" />I understand</button>
                <button className="response-button" onClick={onRepeat}><Repeat size={24} />Please repeat</button>
                <button className="response-button response-unsafe" onClick={() => onUnsafe(latestProfessional.id)}><WarningOctagon size={24} weight="fill" />I do not understand</button>
              </div>

              {latestProfessional.status === 'Unable to translate safely' && (
                <div className="unsafe-message" role="alert">
                  <WarningOctagon size={24} weight="fill" />
                  <p><strong>I could not translate this safely.</strong><br />Please type the message or request qualified communication support.</p>
                </div>
              )}
              <div className="message-controls">
                <button className="text-button" onClick={() => onStartEdit(latestProfessional)}><PencilSimple size={19} />Correct</button>
                <button className="text-button" onClick={onRepeat}><Repeat size={19} />Repeat</button>
                <button className="text-button danger-text" onClick={() => onRemove(latestProfessional.id)}><X size={19} />Cancel message</button>
              </div>
            </article>
          ) : (
            <div className="empty-state"><ChatCircleText size={44} weight="duotone" /><h2>No message yet</h2><p>The healthcare professional can type or choose a phrase.</p></div>
          )}

          <div className="patient-tools">
            <h2>Reply or show how you feel</h2>
            <div className="tool-buttons">
              <button className="secondary-button" onClick={onOpenSymptoms}><Heartbeat size={22} />Symptoms and pain</button>
              <button className="secondary-button" onClick={onOpenCamera}><Camera size={22} />Simulated BSL camera</button>
            </div>
            <div className="input-block patient-reply-block">
              <label htmlFor="patient-reply">Type a response</label>
              <div className="inline-input-action">
                <input id="patient-reply" value={patientReply} onChange={(event) => onPatientReplyChange(event.target.value)} placeholder="Type your response" />
                <button className="primary-button" onClick={onSendPatient} disabled={!patientReply.trim()}>Send</button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="history-section" aria-labelledby="history-title">
        <button className="history-toggle" onClick={() => setShowHistory((value) => !value)} aria-expanded={showHistory}>
          <span><ClipboardText size={23} /><strong id="history-title">Session conversation</strong><small>{messages.length} {messages.length === 1 ? 'message' : 'messages'} held in memory</small></span>
          <span>{showHistory ? 'Hide' : 'Show'} history</span>
        </button>
        {showHistory && (
          <ol className="message-history">
            {messages.map((message) => (
              <li key={message.id} className={`history-message history-${message.sender}`}>
                <div className="history-meta"><strong>{message.sender === 'professional' ? 'Healthcare professional' : 'Patient'}</strong><time>{message.timestamp}</time></div>
                <p>{message.text}</p>
                <div className="history-footer"><StatusBadge status={message.status} /><span>{message.source}</span></div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  )
}

function PhraseLibrary({ onClose, onChoose, onPreview }: {
  onClose: () => void
  onChoose: (phrase: MedicalPhrase) => void
  onPreview: (phrase: MedicalPhrase) => void
}) {
  const [category, setCategory] = useState<string>('All categories')
  const [query, setQuery] = useState('')
  const visible = medicalPhrases.filter((phrase) =>
    (category === 'All categories' || phrase.category === category) &&
    phrase.text.toLowerCase().includes(query.toLowerCase()),
  )
  return (
    <Modal title="Medical phrase library" description="Local phrases for demonstration. High-risk wording should use qualified communication support." onClose={onClose} wide>
      <div className="library-controls">
        <label className="search-field"><span>Search phrases</span><div><MagnifyingGlass size={21} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by words" /></div></label>
        <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{phraseCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <p className="result-count" aria-live="polite">{visible.length} phrases available</p>
      <div className="phrase-list">
        {visible.map((item) => (
          <article className="phrase-item" key={item.id}>
            <div className="phrase-copy">
              <p>{item.text}</p>
              <div className="phrase-tags"><span>{item.category}</span><span className={`risk risk-${item.risk.toLowerCase().replaceAll(' ', '-')}`}>{item.risk}</span>{item.requiresConfirmation && <span>Confirmation required</span>}</div>
              {item.interpreterRecommended && <small><PhoneCall size={17} />Qualified interpreter recommended</small>}
            </div>
            <div className="phrase-actions">
              <span className={item.bslVideoId && item.bslClipStart !== undefined && item.bslClipEnd !== undefined ? 'video-slot video-slot-available' : 'video-slot'}>
                <HandPalm size={20} />{item.bslVideoId && item.bslClipStart !== undefined && item.bslClipEnd !== undefined ? 'University BSL excerpt' : 'No phrase-level video'}
              </span>
              {item.bslVideoId && item.bslClipStart !== undefined && item.bslClipEnd !== undefined && (
                <button className="secondary-button small-button" onClick={() => onPreview(item)}>
                  <Play size={18} weight="fill" />Preview video
                </button>
              )}
              <button className="primary-button small-button" onClick={() => onChoose(item)}>Use phrase</button>
            </div>
          </article>
        ))}
        {visible.length === 0 && <div className="empty-state"><MagnifyingGlass size={40} /><h3>No matching phrase</h3><p>Try another word or category. Manual typing is always available.</p></div>}
      </div>
    </Modal>
  )
}

function SymptomTool({ onClose, onSubmit }: { onClose: () => void; onSubmit: (summary: SymptomSummary) => void }) {
  const [summary, setSummary] = useState<SymptomSummary>({ bodyArea: '', pain: 0, painType: '', duration: '', associated: [], allergies: '', pregnancy: '', urgent: false })
  const toggleAssociated = (item: string) => setSummary((current) => ({
    ...current,
    associated: current.associated.includes(item) ? current.associated.filter((value) => value !== item) : [...current.associated, item],
  }))
  return (
    <Modal title="Symptoms and pain" description="This supports a conversation. It does not diagnose or provide independent triage." onClose={onClose} wide actions={<><button className="text-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={() => onSubmit(summary)}>Share summary</button></>}>
      <div className="symptom-form">
        <fieldset><legend>Where do you feel the problem?</legend><div className="choice-grid">{symptomButtons.map((item) => <button type="button" className={summary.bodyArea === item ? 'choice selected' : 'choice'} onClick={() => setSummary({ ...summary, bodyArea: item })} key={item}>{item}</button>)}</div></fieldset>
        <fieldset className="pain-scale"><legend>Pain intensity: <strong>{summary.pain} out of 10</strong></legend><input aria-label="Pain intensity from 0 to 10" type="range" min="0" max="10" value={summary.pain} onChange={(event) => setSummary({ ...summary, pain: Number(event.target.value) })} /><div><span>0<br /><small>No pain</small></span><output>{summary.pain}</output><span>10<br /><small>Worst pain</small></span></div></fieldset>
        <fieldset><legend>What does it feel like?</legend><div className="choice-grid">{painTypes.map((item) => <button type="button" className={summary.painType === item ? 'choice selected' : 'choice'} onClick={() => setSummary({ ...summary, painType: item })} key={item}>{item}</button>)}</div></fieldset>
        <label className="input-block"><span>How long has this been happening?</span><input value={summary.duration} onChange={(event) => setSummary({ ...summary, duration: event.target.value })} placeholder="For example, two hours or three days" /></label>
        <fieldset><legend>Other symptoms</legend><div className="choice-grid">{associatedSymptoms.map((item) => <button type="button" className={summary.associated.includes(item) ? 'choice selected' : 'choice'} onClick={() => toggleAssociated(item)} key={item}>{item}</button>)}</div></fieldset>
        <label className="input-block"><span>Known allergies</span><input value={summary.allergies} onChange={(event) => setSummary({ ...summary, allergies: event.target.value })} placeholder="Type an allergy or leave blank" /></label>
        <fieldset><legend>Could you be pregnant?</legend><div className="choice-grid choice-grid-small">{['Yes', 'No', 'Not sure', 'Not relevant'].map((item) => <button type="button" className={summary.pregnancy === item ? 'choice selected' : 'choice'} onClick={() => setSummary({ ...summary, pregnancy: item })} key={item}>{item}</button>)}</div></fieldset>
        <label className="urgent-check"><input type="checkbox" checked={summary.urgent} onChange={(event) => setSummary({ ...summary, urgent: event.target.checked })} /><BellRinging size={25} weight="fill" /><span><strong>I need help now</strong><small>This alerts the person using this screen. It does not contact emergency services.</small></span></label>
      </div>
    </Modal>
  )
}

function CameraSimulation({ onClose, onUse }: { onClose: () => void; onUse: (text: string) => void }) {
  const [selection, setSelection] = useState('')
  const examples = ['I have pain', 'I feel dizzy', 'I need an interpreter', 'Please explain again']
  return (
    <Modal title="Simulated BSL camera" description="Simulated BSL recognition for prototype demonstration." onClose={onClose} actions={<button className="primary-button" disabled={!selection} onClick={() => onUse(selection)}>Use simulated response</button>}>
      <div className="camera-stage"><Camera size={58} weight="duotone" /><strong>Camera preview placeholder</strong><p>No video is captured, stored or analysed.</p></div>
      <div className="simulation-warning"><Warning size={22} weight="fill" /><p>This prototype does not recognise free BSL. Choose a sample response to demonstrate the intended flow.</p></div>
      <fieldset><legend>Choose a simulated result</legend><div className="stacked-choices">{examples.map((item) => <label key={item}><input type="radio" name="simulated-result" checked={selection === item} onChange={() => setSelection(item)} /><span>{item}</span></label>)}</div></fieldset>
    </Modal>
  )
}

function BslVideoExperience({ message, phraseId, isOnline, onClose, onInterpreter }: {
  message?: ConversationMessage
  phraseId?: string | null
  isOnline: boolean
  onClose: () => void
  onInterpreter: () => void
}) {
  const matchingPhrase = findCuratedPhrase(message?.text ?? '', phraseId ?? message?.phraseId)
  const reference = getBslVideoReference(matchingPhrase?.bslVideoId)
  const clipStart = matchingPhrase?.bslClipStart
  const clipEnd = matchingPhrase?.bslClipEnd

  if (!reference || !matchingPhrase || clipStart === undefined || clipEnd === undefined) {
    return (
      <Modal
        title="BSL video excerpt unavailable"
        description="No curated phrase-level BSL excerpt is linked to this wording."
        onClose={onClose}
        actions={<button className="primary-button" onClick={onInterpreter}><PhoneCall size={20} />Request an interpreter</button>}
      >
        <div className="unsafe-message bsl-unavailable" role="alert">
          <WarningOctagon size={28} weight="fill" />
          <p><strong>Unable to translate safely</strong><br />The prototype will not infer or invent a BSL translation for unmatched wording.</p>
        </div>
        <div className="caption-box"><strong>Message shown as text</strong><p>{message?.text ?? 'No message selected.'}</p></div>
      </Modal>
    )
  }

  return (
    <Modal
      title="BSL phrase video excerpt"
      description="An attributed educational excerpt linked to the selected English prompt."
      onClose={onClose}
      wide
      actions={<><button className="text-button" onClick={onClose}>Close</button><button className="primary-button" onClick={onInterpreter}><PhoneCall size={20} />Request an interpreter</button></>}
    >
      <div className="bsl-safety-strip" role="note">
        <WarningOctagon size={24} weight="fill" />
        <p><strong>Educational reference — not validated for clinical use.</strong> This excerpt has not been independently validated as a safe clinical translation. Confirm understanding and use a qualified interpreter for high-risk communication.</p>
      </div>

      <div className="bsl-experience-grid">
        <section className="source-video-card" aria-labelledby="source-video-title">
          <div className="experience-card-heading"><span>BSL teaching excerpt</span><span className="licence-chip">{reference.licence}</span></div>
          <h3 id="source-video-title">{reference.title}</h3>
          {isOnline ? (
            <div className="source-video-frame">
              <iframe
                src={getBslClipEmbedUrl(reference, clipStart, clipEnd)}
                title={`${matchingPhrase.text} — University of Edinburgh BSL video excerpt`}
                allow="autoplay; fullscreen; encrypted-media"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <div className="offline-video-fallback" role="status"><WifiSlash size={38} /><strong>Video unavailable offline</strong><p>The text message remains available. Use a qualified interpreter for communication.</p></div>
          )}
          <p className="source-scope">{reference.scope}</p>
          <div className="source-links">
            <a href={reference.sourceUrl} target="_blank" rel="noreferrer">Open source video <ArrowSquareOut size={17} /></a>
            <a href={reference.licenceUrl} target="_blank" rel="noreferrer">Read {reference.licence} licence <ArrowSquareOut size={17} /></a>
          </div>
        </section>

        <section className="phrase-context-card" aria-labelledby="phrase-context-title">
          <div className="experience-card-heading"><span>Phrase context</span><StatusBadge status="Needs confirmation" /></div>
          <h3 id="phrase-context-title">Selected English phrase</h3>
          <p className="phrase-display">{matchingPhrase.text}</p>
          <dl className="clip-details">
            <div><dt>Excerpt</dt><dd>{formatClipTime(clipStart)}–{formatClipTime(clipEnd)}</dd></div>
            <div><dt>Category</dt><dd>{matchingPhrase.category}</dd></div>
            <div><dt>Risk</dt><dd>{matchingPhrase.risk}</dd></div>
          </dl>
          <p className="clip-guidance">The wording is aligned to the teaching prompt shown in this excerpt; it has not been linguistically or clinically validated by this prototype.</p>
        </section>
      </div>

      <footer className="bsl-attribution">
        <ShieldCheck size={22} />
        <p><strong>Attribution:</strong> excerpt from “{reference.title}”, {reference.creator}, <a href={reference.collectionUrl} target="_blank" rel="noreferrer">British Sign Language for healthcare</a>, licensed under <a href={reference.licenceUrl} target="_blank" rel="noreferrer">{reference.licence}</a>.</p>
      </footer>
    </Modal>
  )
}

function InterpreterModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Request a qualified BSL interpreter" description="Human communication support remains essential for complex or high-risk decisions." onClose={onClose} actions={<><button className="text-button" onClick={onClose}>Close simulation</button><a className="primary-button" href="/signslot.html" target="_blank" rel="noreferrer"><CalendarCheck size={20} />Open the SignSlot scheduling demo</a></>}>
      <div className="interpreter-illustration"><PhoneCall size={54} weight="duotone" /><div><strong>Interpreter connection simulated</strong><p>No request has been sent and no external service is connected.</p></div></div>
      <p>In the full concept, this request goes to SignSlot. SignSlot matches a certified interpreter to the patient's needs and the clinician's free time, books them in person or by video, and rebooks automatically if they cancel. The demo uses fictional people only.</p>
      <p>A real product would connect to the interpreting service approved by the healthcare organisation. Availability, identity checks, waiting information and escalation routes would need local design and governance.</p>
      <div className="safe-callout"><ShieldCheck size={23} /><p>For consent, medication, diagnosis or urgent care, follow local policy and use qualified communication support.</p></div>
    </Modal>
  )
}

function EraseModal({ onClose, onErase }: { onClose: () => void; onErase: () => void }) {
  return (
    <Modal title="End and erase session?" description="This removes all messages and selections held in memory on this device." onClose={onClose} actions={<><button className="text-button" onClick={onClose}>Keep session</button><button className="danger-button" onClick={onErase}><Trash size={20} />End and erase</button></>}>
      <div className="erase-summary"><Trash size={46} weight="duotone" /><p>This cannot be undone. No copy is kept by the prototype.</p></div>
    </Modal>
  )
}

function SettingsModal({ preferences, onChange, onClose }: { preferences: Preferences; onChange: (value: Preferences) => void; onClose: () => void }) {
  return (
    <Modal title="Display and communication" description="Adjust the prototype for this session." onClose={onClose} actions={<button className="primary-button" onClick={onClose}>Done</button>}>
      <div className="settings-list">
        <label><span><TextAa size={24} /><span><strong>Large text</strong><small>Increase the base text size.</small></span></span><input type="checkbox" checked={preferences.largeText} onChange={(event) => onChange({ ...preferences, largeText: event.target.checked })} /></label>
        <label><span><PersonArmsSpread size={24} /><span><strong>High contrast</strong><small>Strengthen borders and focus states.</small></span></span><input type="checkbox" checked={preferences.highContrast} onChange={(event) => onChange({ ...preferences, highContrast: event.target.checked })} /></label>
        <label><span><Moon size={24} /><span><strong>Dark mode</strong><small>Use the dark colour theme for this session.</small></span></span><input type="checkbox" checked={preferences.darkMode} onChange={(event) => onChange({ ...preferences, darkMode: event.target.checked })} /></label>
        <label><span><HandPalm size={24} /><span><strong>BSL preference</strong><small>Show attributed BSL video excerpts for curated phrases.</small></span></span><input type="checkbox" checked={preferences.bsl} onChange={(event) => onChange({ ...preferences, bsl: event.target.checked })} /></label>
        <label><span><Ear size={24} /><span><strong>Live captions</strong><small>Use browser speech input when available.</small></span></span><input type="checkbox" checked={preferences.captions} onChange={(event) => onChange({ ...preferences, captions: event.target.checked })} /></label>
      </div>
    </Modal>
  )
}

function PrivacyPage({ onBack }: { onBack: () => void }) {
  return (
    <section className="privacy-page page-frame">
      <button className="text-button page-back" onClick={onBack}><ArrowLeft size={20} />Back to the prototype</button>
      <header className="page-heading"><h1>Privacy in this prototype</h1><p>This demonstration is designed to avoid collecting or retaining personal data.</p></header>
      <div className="privacy-layout">
        <section><ShieldCheck size={38} weight="duotone" /><h2>What happens now</h2><ul><li>Conversation content stays in browser memory.</li><li>Reloading the page erases the session.</li><li>No server, remote database, telemetry or tracking cookie is used.</li><li>Examples contain no real patient information.</li><li>Microphone access is optional and controlled by the browser.</li></ul></section>
        <section><FirstAid size={38} weight="duotone" /><h2>Before any real deployment</h2><p>A proposed six-month retention period is not implemented. Any retention would need a defined purpose, lawful basis, data minimisation, security controls, a data protection impact assessment and an approved NHS policy.</p><p>Clinical safety, accessibility, procurement, information governance and medical device questions would also need specialist review.</p></section>
      </div>
      <div className="safety-notice privacy-notice"><WarningOctagon size={25} weight="fill" /><p><strong>Do not enter real information.</strong><br />This is a student prototype and is not approved for clinical use.</p></div>
    </section>
  )
}

export default App
