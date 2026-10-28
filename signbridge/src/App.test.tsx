import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { getBslClipEmbedUrl, getBslVideoReference } from './data/bslVideos'
import { medicalPhrases, phraseCategories } from './data/phrases'

describe('SignBridge prototype', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel: vi.fn(), speak: vi.fn() },
    })
    class FakeSpeechSynthesisUtterance {
      text: string
      lang = ''
      rate = 1
      onend: (() => void) | null = null
      onerror: (() => void) | null = null

      constructor(text: string) {
        this.text = text
      }
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeSpeechSynthesisUtterance)
  })

  it('shows the clinical limitation and communication preferences on entry', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /how would you like to communicate/i })).toBeInTheDocument()
    expect(screen.getByText(/not for diagnosis, consent, medication decisions or clinical use/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /large text/i })).toBeInTheDocument()
    const headerPreferences = screen.getByRole('group', { name: /communication preferences/i })
    expect(within(headerPreferences).getByRole('checkbox', { name: /^bsl$/i })).toBeChecked()
    expect(within(headerPreferences).getByRole('checkbox', { name: /live captions/i })).toBeChecked()
    expect(within(headerPreferences).getByRole('checkbox', { name: /typed conversation/i })).toBeChecked()
    expect(screen.getByRole('button', { name: /request a qualified bsl interpreter/i })).toBeInTheDocument()
  })

  it('keeps header preferences in sync and opens the text-to-speech conversation', async () => {
    const user = userEvent.setup()
    render(<App />)

    const bslPreference = screen.getByRole('checkbox', { name: /^bsl$/i })
    await user.click(bslPreference)
    expect(bslPreference).not.toBeChecked()

    const openButton = screen.getByRole('button', { name: /text to speech/i })
    await user.click(openButton)
    const dialog = screen.getByRole('dialog', { name: /text to speech/i })
    const message = within(dialog).getByRole('textbox', { name: /text to read aloud/i })
    await user.type(message, 'Please take a seat.')
    await user.click(within(dialog).getByRole('radio', { name: /^patient$/i }))
    expect(within(dialog).getByText('Please take a seat.', { selector: '.speech-preview-bubble p' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /speak text/i }))
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1)
    const utterance = vi.mocked(window.speechSynthesis.speak).mock.calls[0][0]
    expect(utterance.text).toBe('Please take a seat.')
    expect(utterance.lang).toBe('en-GB')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: /text to speech/i })).not.toBeInTheDocument()
    expect(openButton).toHaveFocus()
  })

  it('keeps typed text available when browser speech playback is unsupported', async () => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined })
    vi.stubGlobal('SpeechSynthesisUtterance', undefined)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /text to speech/i }))
    const dialog = screen.getByRole('dialog', { name: /text to speech/i })
    await user.type(within(dialog).getByRole('textbox', { name: /text to read aloud/i }), 'Please take a seat.')

    expect(within(dialog).getByText(/audio playback is not available in this browser/i)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /speak text/i })).toBeDisabled()
    expect(within(dialog).getByText('Please take a seat.', { selector: '.speech-preview-bubble p' })).toBeVisible()
  })

  it('hands an interpreter request to the SignSlot scheduling demo', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /request a qualified bsl interpreter/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/interpreter connection simulated/i)).toBeInTheDocument()
    const link = within(dialog).getByRole('link', { name: /open the signslot scheduling demo/i })
    expect(link).toHaveAttribute('href', '/signslot.html')
  })

  it('opens all three pathway choices after onboarding', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(screen.getByRole('button', { name: /reception/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /consultation/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /emergency/i })).toBeInTheDocument()
  })

  it('supports keyboard activation and a session-only dark theme', async () => {
    const user = userEvent.setup()
    render(<App />)
    const continueButton = screen.getByRole('button', { name: /continue/i })
    continueButton.focus()
    expect(continueButton).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: /where are you today/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /display/i }))
    await user.click(screen.getByRole('checkbox', { name: /dark mode/i }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('supports a typed professional message and patient confirmation', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /continue/i }))
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
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /reception/i }))
    await user.click(screen.getByRole('button', { name: /end session/i }))
    const dialog = screen.getByRole('dialog', { name: /end and erase session/i })
    await user.click(within(dialog).getByRole('button', { name: /^end and erase$/i }))
    expect(screen.getByRole('heading', { name: /how would you like to communicate/i })).toBeInTheDocument()
    expect(screen.queryByText(/hello\. how would you prefer/i)).not.toBeInTheDocument()
  })

  it('labels simulated BSL recognition clearly', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /consultation/i }))
    await user.click(screen.getByRole('button', { name: /simulated bsl camera/i }))
    expect(screen.getByText('Simulated BSL recognition for prototype demonstration.')).toBeInTheDocument()
    expect(screen.getByText(/does not recognise free bsl/i)).toBeInTheDocument()
  })

  it('shows an attributed university excerpt for a curated phrase', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /continue/i }))
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
    await user.click(screen.getByRole('button', { name: /continue/i }))
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
    await user.click(screen.getByRole('button', { name: /continue/i }))
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
    await user.click(screen.getByRole('button', { name: /continue/i }))
    await user.click(screen.getByRole('button', { name: /consultation/i }))
    await user.type(screen.getByLabelText(/message in plain english/i), 'Please describe what happened.')
    await user.click(screen.getByRole('button', { name: /show to patient/i }))
    await user.click(screen.getByRole('button', { name: /open bsl video excerpt/i }))

    expect(screen.getByText(/unable to translate safely/i)).toBeInTheDocument()
    expect(screen.getByText(/will not infer or invent a bsl translation/i)).toBeInTheDocument()
  })

  it('keeps a manual fallback when the university video is offline', async () => {
    const user = userEvent.setup()
    render(<App />)
    window.dispatchEvent(new Event('offline'))
    await user.click(screen.getByRole('button', { name: /continue/i }))
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
