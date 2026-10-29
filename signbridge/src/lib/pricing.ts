// Interpreter rates from the BSL Pricing and Insurance Framework.
import { splitSlot } from '../data/demoDirectory'

export const rates = {
  videoPerMinute: 10,
  videoMinimum: 50,
  videoMinimumMinutes: 5,
  subtitlesPerMinute: 2,
  liveHourly: 60,
  extendedHourly: 120,
  outOfHoursMultiplier: 1.5,
}

export interface Fee {
  total: number
  perInterpreter: number
  interpreters: number
  rule: string
}

const pence = (amount: number) => Math.round(amount * 100) / 100

export const formatPounds = (amount: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)

/** Weekends, and starts between 8 PM and 7 AM, are out of hours. */
export function isOutOfHours(slot: string) {
  const { day, time } = splitSlot(slot)
  const hour = Number(time.split(':')[0])
  return /^(Sat|Sun)/.test(day) || hour >= 20 || hour < 7
}

/** Video translation returning English text, billed per started minute with a 5-minute minimum. */
export function videoFee(seconds: number, subtitles = false): Fee {
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  const underMinimum = minutes < rates.videoMinimumMinutes
  const base = underMinimum ? rates.videoMinimum : minutes * rates.videoPerMinute
  const total = pence(base + (subtitles ? minutes * rates.subtitlesPerMinute : 0))
  const rule = underMinimum
    ? `Under 5 minutes: £${rates.videoMinimum} minimum`
    : `${minutes} min × £${rates.videoPerMinute}`
  return { total, perInterpreter: total, interpreters: 1, rule: subtitles ? `${rule} + subtitles` : rule }
}

/**
 * Live consultation. Up to an hour bills a full hour. Over an hour bills £120/hour and the
 * platform books two interpreters, who share it. Out of hours multiplies either rate by 1.5.
 */
export function liveFee(minutes: number, slot: string): Fee {
  const extended = minutes > 60
  const outOfHours = isOutOfHours(slot)
  const multiplier = outOfHours ? rates.outOfHoursMultiplier : 1
  const base = extended ? (minutes / 60) * rates.extendedHourly : rates.liveHourly
  const total = pence(base * multiplier)
  const interpreters = extended ? 2 : 1
  const rule = [
    extended ? `${minutes} min at £${rates.extendedHourly}/hour, shared by 2 interpreters` : minutes < 60 ? '1-hour minimum' : `1 hour at £${rates.liveHourly}`,
    outOfHours ? 'out of hours × 1.5' : '',
  ].filter(Boolean).join(', ')
  return { total, perInterpreter: pence(total / interpreters), interpreters, rule }
}
