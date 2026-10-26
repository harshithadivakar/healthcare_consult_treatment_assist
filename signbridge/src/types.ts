export type Journey = 'Reception' | 'Consultation' | 'Emergency'

export type RiskLevel = 'Routine' | 'Sensitive' | 'High risk'

export type MessageStatus =
  | 'Confirmed'
  | 'Needs confirmation'
  | 'Unable to translate safely'

export type PhraseCategory =
  | 'Identity and appointment'
  | 'Communication preferences'
  | 'Symptoms'
  | 'Pain'
  | 'Food and drink'
  | 'Allergies'
  | 'Medication'
  | 'Toileting and reproductive health'
  | 'Medical history'
  | 'Consent and understanding'
  | 'Emergency warning signs'
  | 'Next steps'

export interface MedicalPhrase {
  id: string
  text: string
  category: PhraseCategory
  risk: RiskLevel
  requiresConfirmation: boolean
  interpreterRecommended: boolean
  bslVideoId?: string
  bslClipStart?: number
  bslClipEnd?: number
}

export interface ConversationMessage {
  id: string
  sender: 'professional' | 'patient'
  text: string
  status: MessageStatus
  timestamp: string
  source?: 'typed' | 'phrase' | 'voice' | 'symptom tool' | 'camera simulation'
  phraseId?: string
}

export interface Preferences {
  bsl: boolean
  captions: boolean
  typed: boolean
  largeText: boolean
  highContrast: boolean
  darkMode: boolean
}

export interface SymptomSummary {
  bodyArea: string
  pain: number
  painType: string
  duration: string
  associated: string[]
  allergies: string
  pregnancy: string
  urgent: boolean
}
