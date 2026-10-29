import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { getBslClipEmbedUrl, getBslVideoReference } from './data/bslVideos'
import { medicalPhrases, phraseCategories } from './data/phrases'
import { interpreterProfiles } from './data/demoDirectory'
import { resetPortal, updatePortal } from './data/portalStore'
import type { PortalData } from './data/portalStore'
import { modelInfo, predict, rankInterpreters } from './lib/matching'
import { liveFee, videoFee } from './lib/pricing'
import type { FeatureVector } from './lib/matching'

function renderConversationSupport() {
  const result = render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /in-room conversation support/i }))
  return result
}

describe('SignBridge care journey', () => {
  beforeEach(() => resetPortal())

  it('shows the three-phase flow with patient, interpreter and doctor lanes on entry', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /one portal for the whole appointment/i })).toBeInTheDocument()
    for (const phase of [/pre-consultation/i, /^consultation$/i, /post-consultation/i, /rate and close/i]) {
      expect(screen.getByRole('heading', { name: phase })).toBeInTheDocument()
    }
    expect(screen.getByText(/interpreter no-show/i)).toBeInTheDocument()
    expect(screen.getByText(/7-day record window/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /request a qualified bsl interpreter/i })).toBeInTheDocument()
  })

  it('saves a patient booking and shows it on the doctor and interpreter pages', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^patient view/i }))
    await user.click(screen.getByRole('radio', { name: /dr shah/i }))
    expect(screen.getByRole('button', { name: /thu 29 oct.*already booked/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /mon 2 nov.*no interpreter free/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /tue 3 nov.*09:30/i }))
    await user.click(screen.getByRole('button', { name: /book appointment/i }))
    expect(screen.getByText(/booked with dr shah on tue 3 nov 09:30/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^doctor$/i }))
    await user.selectOptions(screen.getByRole('combobox', { name: /viewing as doctor/i }), 'doc-shah')
    let alexRow = screen.getByRole('cell', { name: 'Alex Lewis' }).closest('[role="row"]') as HTMLElement
    expect(within(alexRow).getByText('Patient choosing')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^patient$/i }))
    await user.click(screen.getAllByRole('button', { name: /choose an interpreter/i })[1])
    expect(screen.getByText(/ranked by a logistic regression trained with scikit-learn/i)).toBeInTheDocument()
    const chooseButton = screen.getAllByRole('button', { name: /^choose /i }).find((button) => !button.hasAttribute('disabled'))!
    const chosenFirstName = chooseButton.textContent!.replace('Choose ', '')
    await user.click(chooseButton)
    const chosen = interpreterProfiles.find((item) => item.name.startsWith(chosenFirstName))!

    await user.click(screen.getByRole('button', { name: /^doctor$/i }))
    await user.selectOptions(screen.getByRole('combobox', { name: /viewing as doctor/i }), 'doc-shah')
    alexRow = screen.getByRole('cell', { name: 'Alex Lewis' }).closest('[role="row"]') as HTMLElement
    expect(within(alexRow).getByText(chosen.name)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^bsl interpreter$/i }))
    await user.selectOptions(screen.getByRole('combobox', { name: /viewing as interpreter/i }), chosen.id)
    expect(screen.getByText('Alex Lewis with Dr Shah')).toBeInTheDocument()
  })

  it('lets the patient choose any interpreter, not only the recommended ones', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^patient view/i }))
    await user.click(screen.getByRole('tab', { name: /choose interpreter/i }))
    const buttons = screen.getAllByRole('button', { name: /^choose /i })
    expect(buttons).toHaveLength(interpreterProfiles.length)
    buttons.forEach((button) => expect(button).toBeEnabled())
    expect(screen.getAllByText(/choosing them sends a request to confirm/i).length).toBeGreaterThan(0)
    await user.click(buttons.at(-1)!)
    expect(screen.getByRole('button', { name: /chosen/i })).toBeInTheDocument()
  })

  it('delivers messages from patient to doctor and back in one conversation', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^patient view/i }))
    await user.click(screen.getByRole('tab', { name: /messages/i }))
    await user.selectOptions(screen.getByRole('combobox', { name: /start a conversation/i }), 'doc-bell')
    await user.type(screen.getByRole('textbox', { name: /message to dr bell/i }), 'Can I bring my partner to the appointment?{Enter}')
    expect(within(screen.getByRole('region', { name: /conversation with dr bell/i })).getByText('Can I bring my partner to the appointment?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^doctor$/i }))
    const doctorThread = screen.getByRole('region', { name: /conversation with alex lewis/i })
    expect(within(doctorThread).getByText('Can I bring my partner to the appointment?')).toBeInTheDocument()
    await user.type(within(doctorThread).getByRole('textbox', { name: /message to alex lewis/i }), 'Yes, of course.')
    await user.click(within(doctorThread).getByRole('button', { name: /^send$/i }))

    await user.click(screen.getByRole('button', { name: /^patient$/i }))
    expect(screen.getByRole('tab', { name: /messages/i })).toHaveTextContent(/2$/)
    await user.click(screen.getByRole('tab', { name: /messages/i }))
    const patientThread = screen.getByRole('region', { name: /conversation with dr bell/i })
    expect(within(patientThread).getByText('Yes, of course.')).toBeInTheDocument()
    expect(within(patientThread).getByText('Can I bring my partner to the appointment?')).toBeInTheDocument()
  })

  it('shows a message sent in another tab without reloading', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^doctor view/i }))
    const saved = JSON.parse(window.localStorage.getItem('signbridge-demo-portal-v2')!) as PortalData
    saved.messages.push({
      id: 'other-tab', from: { role: 'patient', id: 'pat-alex', name: 'Alex Lewis' }, to: { role: 'doctor', id: 'doc-bell', name: 'Dr Bell' },
      kind: 'message', subject: 'Message from Alex Lewis', body: 'Sent from the other tab', createdAt: Date.now(),
    })
    const value = JSON.stringify(saved)
    act(() => {
      window.localStorage.setItem('signbridge-demo-portal-v2', value)
      window.dispatchEvent(new StorageEvent('storage', { key: 'signbridge-demo-portal-v2', newValue: value }))
    })
    expect(within(screen.getByRole('region', { name: /conversation with alex lewis/i })).getByText('Sent from the other tab')).toBeInTheDocument()
  })

  it('routes questionnaire answers to the matched interpreter and the interpretation to the doctor', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^patient view/i }))
    await user.click(screen.getByRole('tab', { name: /messages/i }))
    await user.click(screen.getByRole('radio', { name: /type answers/i }))
    for (const box of screen.getAllByRole('textbox').slice(0, 3)) await user.type(box, 'Chest pain since Monday.')
    await user.click(screen.getByRole('button', { name: /send answers/i }))
    const status = screen.getByText(/answers sent\./i).textContent!
    const interpreterName = /Answers sent\. (.+?) \(\d+% match\)/.exec(status)![1]
    const interpreter = interpreterProfiles.find((item) => item.name === interpreterName)!

    await user.click(screen.getByRole('button', { name: /^bsl interpreter$/i }))
    await user.selectOptions(screen.getByRole('combobox', { name: /viewing as interpreter/i }), interpreter.id)
    await user.type(screen.getByRole('textbox', { name: /english interpretation for dr bell/i }), 'Chest pain since Monday.')
    await user.click(screen.getByRole('button', { name: /send to dr bell/i }))

    await user.click(screen.getByRole('button', { name: /^doctor$/i }))
    expect(within(screen.getByRole('region', { name: /conversation with/i })).getByText('Interpretation: Alex Lewis pre-consultation')).toBeInTheDocument()
    const alexRow = screen.getByRole('cell', { name: 'Alex Lewis' }).closest('[role="row"]') as HTMLElement
    expect(within(alexRow).getByText('Interpreted')).toBeInTheDocument()
  })

  it('recommends open appointments to interpreters the model ranks highly', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^bsl interpreter view/i }))
    expect(screen.getByText(/how matching works/i)).toBeInTheDocument()
    expect(screen.getByText('Bisi Okonjo for Dr Shah')).toBeInTheDocument()
    const recommendations = screen.getByRole('region', { name: /new appointments recommended for you/i })
    const [accept] = within(recommendations).getAllByRole('button', { name: /^accept$/i })
    await user.click(accept)
    expect(within(screen.getByRole('region', { name: /next five working days/i })).getAllByText(/consultation/i).length).toBeGreaterThan(1)
  })
})

describe('interpreter matching model', () => {
  beforeEach(() => resetPortal())

  it('reproduces the scikit-learn predictions in the browser', () => {
    for (const vector of modelInfo.testVectors) {
      expect(predict(vector.x as FeatureVector).probability).toBeCloseTo(vector.p, 6)
    }
  })

  it('moves an interpreter reported as a no-show to last priority', () => {
    const context = { patientId: 'pat-alex', doctorId: 'doc-bell', slot: 'Thu 29 Oct 14:15', mode: 'Online' as const }
    let snapshot: PortalData | undefined
    updatePortal((data) => (snapshot = data))
    const top = rankInterpreters(snapshot!, context)[0]
    updatePortal((data) => (snapshot = { ...data, reportedNoShows: { [top.interpreter.id]: 1 } }))
    const ranked = rankInterpreters(snapshot!, context).filter((match) => match.available)
    expect(ranked.at(-1)?.interpreter.id).toBe(top.interpreter.id)
    expect(ranked.at(-1)?.penalised).toBe(true)
  })

  it('saves bookings in the browser and deletes records older than 7 days', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
    updatePortal((data) => ({
      ...data,
      bookings: [...data.bookings, { id: 'fresh', patientId: 'pat-alex', doctorId: 'doc-novak', slot: 'Tue 3 Nov 14:00', mode: 'Online', durationMinutes: 30, interpreterId: null, coInterpreterId: null, noShow: false, createdAt: Date.now() }],
      messages: [...data.messages, { ...data.messages[0], id: 'old', createdAt: eightDaysAgo }],
    }))
    const saved = JSON.parse(window.localStorage.getItem('signbridge-demo-portal-v2')!) as PortalData
    expect(saved.bookings.some((booking) => booking.id === 'fresh')).toBe(true)
    expect(saved.messages.some((message) => message.id === 'old')).toBe(false)
  })
})

describe('interpreter pricing and earnings', () => {
  beforeEach(() => resetPortal())

  it('applies the video translation minimum, per-minute rate and subtitle modifier', () => {
    expect(videoFee(72).total).toBe(50)
    expect(videoFee(380).total).toBe(70)
    expect(videoFee(380, true).total).toBe(84)
  })

  it('bills a full hour, splits extended sessions between two interpreters and adds out-of-hours', () => {
    expect(liveFee(30, 'Thu 29 Oct 09:30')).toMatchObject({ total: 60, perInterpreter: 60, interpreters: 1 })
    expect(liveFee(90, 'Thu 29 Oct 09:30')).toMatchObject({ total: 180, perInterpreter: 90, interpreters: 2 })
    expect(liveFee(30, 'Fri 30 Oct 20:30').total).toBe(90)
  })

  it('shows expected earnings this week and adds an accepted appointment', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^bsl interpreter view/i }))
    const earnings = screen.getByRole('region', { name: /earnings/i })
    // Amara: £60 + £90 out of hours live, £50 + £70 video translation.
    expect(within(earnings).getAllByText('£270.00').length).toBeGreaterThan(0)
    expect(within(earnings).getByText(/£50\.00 already earned/i)).toBeInTheDocument()
    expect(within(earnings).getByRole('columnheader', { name: 'Breakdown' })).toBeInTheDocument()
    expect(within(earnings).getByRole('columnheader', { name: 'Earnings' })).toBeInTheDocument()
    expect(within(earnings).getByText(/out of hours × 1\.5/i)).toBeInTheDocument()

    const recommendations = screen.getByRole('region', { name: /new appointments recommended for you/i })
    await user.click(within(recommendations).getAllByRole('button', { name: /^accept$/i })[0])
    expect(within(screen.getByRole('region', { name: /earnings/i })).getAllByText('£330.00').length).toBeGreaterThan(0)
  })

  it('only books appointments over an hour when 2 interpreters are free', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^patient view/i }))
    await user.click(screen.getByRole('radio', { name: /dr novak/i }))
    expect(screen.getByRole('button', { name: /tue 3 nov.*14:00.*1 interpreter free/i })).toBeEnabled()
    await user.click(screen.getByRole('radio', { name: /2 interpreters needed/i }))
    expect(screen.getByRole('button', { name: /tue 3 nov.*14:00.*needs 2 interpreters, 1 free/i })).toBeDisabled()
  })

  it('adds a co-interpreter automatically for appointments over an hour', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^bsl interpreter view/i }))
    const recommendations = screen.getByRole('region', { name: /new appointments recommended for you/i })
    const bisiCard = within(recommendations).getByText(/bisi okonjo/i).closest('article') as HTMLElement
    expect(within(bisiCard).getByText(/earnings: £90\.00 · needs 2 interpreters/i)).toBeInTheDocument()
    await user.click(within(bisiCard).getByRole('button', { name: /^accept$/i }))

    await user.click(screen.getByRole('button', { name: /^doctor$/i }))
    await user.selectOptions(screen.getByRole('combobox', { name: /viewing as doctor/i }), 'doc-shah')
    const bisiRow = screen.getByRole('cell', { name: 'Bisi Okonjo' }).closest('[role="row"]') as HTMLElement
    expect(within(bisiRow).getByText(/^Amara Okafor \+ .+/)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /rate amara okafor/i })).toBeInTheDocument()
  })

  it('keeps pay out of the patient and doctor views', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^doctor view/i }))
    expect(screen.queryByText(/£\d/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^patient$/i }))
    await user.click(screen.getByRole('button', { name: /thu 29 oct.*10:00|fri 30 oct.*10:00/i }))
    expect(screen.queryByText(/£\d/)).not.toBeInTheDocument()
  })
})

describe('SignBridge prototype', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
  })

  it('shows the clinical limitation and communication preferences on entry', () => {
    renderConversationSupport()
    expect(screen.getByRole('heading', { name: /how would you like to communicate/i })).toBeInTheDocument()
    expect(screen.getByText(/not for diagnosis, consent, medication decisions or clinical use/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /large text/i })).toBeInTheDocument()
    const headerPreferences = screen.getByRole('group', { name: /communication preferences/i })
    expect(within(headerPreferences).getByRole('checkbox', { name: /^bsl$/i })).toBeChecked()
    expect(within(headerPreferences).getByRole('checkbox', { name: /live captions/i })).toBeChecked()
    expect(within(headerPreferences).getByRole('checkbox', { name: /typed conversation/i })).toBeChecked()
    expect(screen.getByRole('button', { name: /^conversation$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /request a qualified bsl interpreter/i })).toBeInTheDocument()
  })

  it('keeps header preferences in sync and opens the full conversation directly', async () => {
    const user = userEvent.setup()
    renderConversationSupport()

    const bslPreference = screen.getByRole('checkbox', { name: /^bsl$/i })
    await user.click(bslPreference)
    expect(bslPreference).not.toBeChecked()

    const openButton = screen.getByRole('button', { name: /^conversation$/i })
    await user.click(openButton)
    expect(screen.getByRole('heading', { name: /prepare a message/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /message to understand/i })).toBeInTheDocument()
    expect(screen.getByText('Hello. How would you prefer to communicate today?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^conversation$/i })).toHaveAttribute('aria-current', 'page')
  })

  it('hands an interpreter request to the SignSlot scheduling demo', async () => {
    const user = userEvent.setup()
    renderConversationSupport()
    await user.click(screen.getByRole('button', { name: /request a qualified bsl interpreter/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/interpreter connection simulated/i)).toBeInTheDocument()
    const link = within(dialog).getByRole('link', { name: /open the signslot scheduling demo/i })
    expect(link).toHaveAttribute('href', '/signslot.html')
  })

  it('keeps all three pathway choices available from the conversation', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^conversation$/i }))
    await user.click(screen.getByRole('button', { name: /go back/i }))
    expect(screen.getByRole('button', { name: /reception/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /consultation/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /emergency/i })).toBeInTheDocument()
  })

  it('supports keyboard activation and a session-only dark theme', async () => {
    const user = userEvent.setup()
    render(<App />)
    const conversationButton = screen.getByRole('button', { name: /^conversation$/i })
    conversationButton.focus()
    expect(conversationButton).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: /prepare a message/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /display/i }))
    await user.click(screen.getByRole('checkbox', { name: /dark mode/i }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('supports a typed professional message and patient confirmation', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^conversation$/i }))
    await user.click(screen.getByRole('button', { name: /go back/i }))
    await user.click(screen.getByRole('button', { name: /consultation/i }))

    const input = screen.getByLabelText(/message in plain english/i)
    await user.type(input, 'Can you show me where it hurts?')
    await user.click(screen.getByRole('button', { name: /show to patient/i }))

    expect(screen.getByText('Can you show me where it hurts?')).toBeInTheDocument()
    expect(screen.getByText('Needs confirmation')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /i understand/i }))
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })

  it('erases a session only after confirmation', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^conversation$/i }))
    await user.click(screen.getByRole('button', { name: /end session/i }))
    const dialog = screen.getByRole('dialog', { name: /end and erase session/i })
    await user.click(within(dialog).getByRole('button', { name: /^end and erase$/i }))
    expect(screen.getByRole('heading', { name: /how would you like to communicate/i })).toBeInTheDocument()
    expect(screen.queryByText(/hello\. how would you prefer/i)).not.toBeInTheDocument()
  })

  it('labels simulated BSL recognition clearly', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^conversation$/i }))
    await user.click(screen.getByRole('button', { name: /go back/i }))
    await user.click(screen.getByRole('button', { name: /consultation/i }))
    await user.click(screen.getByRole('button', { name: /simulated bsl camera/i }))
    expect(screen.getByText('Simulated BSL recognition for prototype demonstration.')).toBeInTheDocument()
    expect(screen.getByText(/does not recognise free bsl/i)).toBeInTheDocument()
  })

  it('shows an attributed university excerpt for a curated phrase', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^conversation$/i }))
    await user.click(screen.getByRole('button', { name: /go back/i }))
    await user.click(screen.getByRole('button', { name: /consultation/i }))
    await user.click(screen.getByRole('button', { name: /medical phrases/i }))

    const library = screen.getByRole('dialog', { name: /medical phrase library/i })
    await user.type(within(library).getByPlaceholderText(/search by words/i), 'How do you feel')
    await user.click(within(library).getByRole('button', { name: /use phrase/i }))
    await user.click(screen.getByRole('button', { name: /show to patient/i }))
    await user.click(screen.getByRole('button', { name: /open bsl video excerpt/i }))

    const videoDialog = screen.getByRole('dialog', { name: /bsl phrase video excerpt/i })
    expect(within(videoDialog).getByText(/educational reference.*not validated for clinical use/i)).toBeInTheDocument()
    expect(within(videoDialog).getByTitle(/university of edinburgh bsl video excerpt/i)).toBeInTheDocument()
    expect(within(videoDialog).getByText(/leah fransisco for the university of edinburgh/i)).toBeInTheDocument()
    expect(within(videoDialog).getByRole('button', { name: /request an interpreter/i })).toBeInTheDocument()
  })

  it('previews the video excerpt directly from the phrase library', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^conversation$/i }))
    await user.click(screen.getByRole('button', { name: /go back/i }))
    await user.click(screen.getByRole('button', { name: /consultation/i }))
    await user.click(screen.getByRole('button', { name: /medical phrases/i }))

    const library = screen.getByRole('dialog', { name: /medical phrase library/i })
    await user.type(within(library).getByPlaceholderText(/search by words/i), 'How do you feel')
    const previewButton = within(library).getByRole('button', { name: /preview video/i })
    previewButton.focus()
    expect(previewButton).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('dialog', { name: /bsl phrase video excerpt/i })).toBeInTheDocument()
    expect(screen.getByText(/not validated for clinical use/i)).toBeInTheDocument()
  })

  it('links an exact curated phrase even when it was typed manually', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^conversation$/i }))
    await user.click(screen.getByRole('button', { name: /go back/i }))
    await user.click(screen.getByRole('button', { name: /consultation/i }))
    await user.type(screen.getByLabelText(/message in plain english/i), 'How do you feel?')

    expect(screen.getByRole('button', { name: /preview bsl video excerpt/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /show to patient/i }))
    await user.click(screen.getByRole('button', { name: /open bsl video excerpt/i }))

    expect(screen.getByRole('dialog', { name: /bsl phrase video excerpt/i })).toBeInTheDocument()
  })

  it('refuses to infer BSL for unmatched typed wording', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /^conversation$/i }))
    await user.click(screen.getByRole('button', { name: /go back/i }))
    await user.click(screen.getByRole('button', { name: /consultation/i }))
    await user.type(screen.getByLabelText(/message in plain english/i), 'Please describe what happened.')
    await user.click(screen.getByRole('button', { name: /show to patient/i }))
    await user.click(screen.getByRole('button', { name: /open bsl video excerpt/i }))

    expect(screen.getByText(/unable to translate safely/i)).toBeInTheDocument()
    expect(screen.getByText(/will not infer or invent a bsl translation/i)).toBeInTheDocument()
  })

  it('keeps a manual fallback when the university video is offline', async () => {
    const user = userEvent.setup()
    renderConversationSupport()
    window.dispatchEvent(new Event('offline'))
    await user.click(screen.getByRole('button', { name: /^conversation$/i }))
    await user.click(screen.getByRole('button', { name: /go back/i }))
    await user.click(screen.getByRole('button', { name: /consultation/i }))
    await user.click(screen.getByRole('button', { name: /medical phrases/i }))
    const library = screen.getByRole('dialog', { name: /medical phrase library/i })
    await user.type(within(library).getByPlaceholderText(/search by words/i), 'Where is the pain')
    await user.click(within(library).getByRole('button', { name: /use phrase/i }))
    await user.click(screen.getByRole('button', { name: /show to patient/i }))
    await user.click(screen.getByRole('button', { name: /open bsl video excerpt/i }))

    expect(screen.getByText(/video unavailable offline/i)).toBeInTheDocument()
    expect(screen.getByText(/text message remains available/i)).toBeInTheDocument()
    expect(screen.queryByTitle(/university of edinburgh bsl video excerpt/i)).not.toBeInTheDocument()
  })
})

describe('medical phrase library data', () => {
  it('contains at least 30 structured phrases across every required category', () => {
    expect(medicalPhrases.length).toBeGreaterThanOrEqual(30)
    for (const category of phraseCategories) {
      expect(medicalPhrases.some((phrase) => phrase.category === category)).toBe(true)
    }
    for (const phrase of medicalPhrases) {
      expect(phrase.text.length).toBeGreaterThan(5)
      expect(['Routine', 'Sensitive', 'High risk']).toContain(phrase.risk)
      expect(typeof phrase.requiresConfirmation).toBe('boolean')
      expect(typeof phrase.interpreterRecommended).toBe('boolean')
      expect(phrase.bslVideoId === undefined || typeof phrase.bslVideoId === 'string').toBe(true)
      if (phrase.bslVideoId) {
        expect(typeof phrase.bslClipStart).toBe('number')
        expect(typeof phrase.bslClipEnd).toBe('number')
        expect(phrase.bslClipStart).toBeGreaterThanOrEqual(0)
        expect(phrase.bslClipEnd).toBeGreaterThan(phrase.bslClipStart ?? 0)
        expect((phrase.bslClipEnd ?? 0) - (phrase.bslClipStart ?? 0)).toBeLessThanOrEqual(20)
      }
    }
  })

  it('links at least 20 phrases to bounded University of Edinburgh excerpts', () => {
    const linkedPhrases = medicalPhrases.filter((phrase) => phrase.bslVideoId)
    expect(linkedPhrases.length).toBeGreaterThanOrEqual(20)

    const painPhrase = medicalPhrases.find((phrase) => phrase.id === 'pain-1')
    const reference = getBslVideoReference(painPhrase?.bslVideoId)
    expect(reference).toBeDefined()
    const url = getBslClipEmbedUrl(reference!, painPhrase!.bslClipStart!, painPhrase!.bslClipEnd!)
    expect(url).toContain('kalturaSeekFrom=7')
    expect(url).toContain('kalturaClipTo=18')
  })

  it('keeps “How can I help you?” inside its own teaching prompt', () => {
    const helpPhrase = medicalPhrases.find((phrase) => phrase.id === 'comm-5')
    expect(helpPhrase?.bslClipStart).toBe(437)
    expect(helpPhrase?.bslClipEnd).toBe(442)
  })
})
