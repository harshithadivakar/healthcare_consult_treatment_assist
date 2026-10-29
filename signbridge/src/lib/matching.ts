// Ranks interpreters with the logistic regression trained in ml/train_matching_model.py.
import model from '../data/matchingModel.json'
import { findDoctor, findPatient, interpreterProfiles } from '../data/demoDirectory'
import type { InterpreterProfile, Mode } from '../data/demoDirectory'
import type { Booking, PortalData } from '../data/portalStore'

export type FeatureName = (typeof model.features)[number]['name']
export type FeatureVector = Record<FeatureName, number>

export interface Reason {
  label: string
  impact: number
}

export interface Match {
  interpreter: InterpreterProfile
  score: number
  reasons: Reason[]
  available: boolean
  penalised: boolean
  features: FeatureVector
}

export const modelInfo = model

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

// Says what the value actually is, so a green chip never reads like a warning.
function describe(name: FeatureName, value: number, specialty: string, fallback: string) {
  switch (name) {
    case 'specialtyExperience': return `${plural(value, `${specialty} session`)}`
    case 'similarPatientRating': return `${value.toFixed(1)}★ from similar patients`
    case 'onTimeRate': return `${Math.round(value * 100)}% on time`
    case 'recentNoShows': return value === 0 ? 'No missed appointments' : `${plural(value, 'missed appointment')} recently`
    case 'sameRegion': return value ? 'Signs your regional BSL' : 'Different regional BSL'
    case 'continuity': return value === 0 ? 'Has not worked with you before' : `${plural(value, 'previous session')} with you`
    case 'weeklyWorkload': return `${plural(value, 'booking')} this week`
    default: return fallback
  }
}

export function predict(features: FeatureVector, specialty = '') {
  const contributions = model.features.map((feature) => {
    const raw = features[feature.name]
    const value = feature.transform === 'log1p' ? Math.log1p(raw) : raw
    return { label: specialty ? describe(feature.name, raw, specialty, feature.label) : feature.label, impact: feature.coef * (value - feature.mean) / feature.scale }
  })
  const logit = model.intercept + contributions.reduce((sum, item) => sum + item.impact, 0)
  return { probability: 1 / (1 + Math.exp(-logit)), contributions }
}

export function featuresFor(interpreter: InterpreterProfile, patientId: string, doctorId: string, data: PortalData): FeatureVector {
  const specialty = findDoctor(doctorId)?.specialty ?? 'Cardiology'
  const patient = findPatient(patientId)
  const bookedThisWeek = data.bookings.filter((booking) => booking.interpreterId === interpreter.id || booking.coInterpreterId === interpreter.id).length
  return {
    specialtyExperience: interpreter.specialtyExperience[specialty],
    similarPatientRating: interpreter.similarPatientRating[specialty],
    onTimeRate: interpreter.onTimeRate,
    recentNoShows: interpreter.recentNoShows + (data.reportedNoShows[interpreter.id] ?? 0),
    sameRegion: patient?.region === interpreter.region ? 1 : 0,
    continuity: interpreter.continuity[patientId] ?? 0,
    weeklyWorkload: interpreter.weeklyWorkload + bookedThisWeek,
  }
}

export function isBusy(interpreterId: string, slot: string, data: PortalData, ignoreBookingId?: string) {
  return data.bookings.some((booking) =>
    (booking.interpreterId === interpreterId || booking.coInterpreterId === interpreterId) && booking.slot === slot && booking.id !== ignoreBookingId)
}

/**
 * Ranks every interpreter for a patient and doctor. With a slot, interpreters who are not free
 * or do not offer the mode are marked unavailable. An interpreter reported as a no-show in this
 * demo goes to last priority whatever the model says.
 */
export function rankInterpreters(
  data: PortalData,
  context: { patientId: string; doctorId: string; slot?: string; mode?: Mode; bookingId?: string },
): Match[] {
  const matches = interpreterProfiles.map((interpreter) => {
    const features = featuresFor(interpreter, context.patientId, context.doctorId, data)
    const { probability, contributions } = predict(features, findDoctor(context.doctorId)?.specialty ?? '')
    const available = !context.slot || (
      interpreter.availability.includes(context.slot)
      && (!context.mode || interpreter.modes.includes(context.mode))
      && !isBusy(interpreter.id, context.slot, data, context.bookingId)
    )
    return {
      interpreter,
      score: Math.round(probability * 100),
      reasons: [...contributions].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
      available,
      penalised: (data.reportedNoShows[interpreter.id] ?? 0) > 0,
      features,
    }
  })
  const rank = (match: Match) => (match.available ? 0 : 2) + (match.penalised ? 1 : 0)
  return matches.sort((a, b) => rank(a) - rank(b) || b.score - a.score)
}

/** Over an hour, the platform adds the best other available interpreter as co-interpreter. */
export function coInterpreterFor(data: PortalData, booking: Booking, leadId: string) {
  if (booking.durationMinutes <= 60) return null
  const ranked = rankInterpreters(data, { patientId: booking.patientId, doctorId: booking.doctorId, slot: booking.slot, mode: booking.mode, bookingId: booking.id })
  return ranked.find((match) => match.available && !match.penalised && match.interpreter.id !== leadId)?.interpreter.id ?? null
}

export function availableInterpreterCount(data: PortalData, slot: string, mode?: Mode) {
  return interpreterProfiles.filter((interpreter) =>
    interpreter.availability.includes(slot)
    && (!mode || interpreter.modes.includes(mode))
    && !isBusy(interpreter.id, slot, data),
  ).length
}
