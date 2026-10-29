// Fictional people and appointment slots for the SignBridge portal demonstration.

export type Specialty = 'Cardiology' | 'Diabetes' | 'Physiotherapy'
export type Region = 'London' | 'Manchester' | 'Glasgow'
export type Mode = 'Online' | 'In person'

export interface Doctor {
  id: string
  name: string
  specialty: Specialty
  practice: string
  slots: string[]
}

export interface Patient {
  id: string
  name: string
  region: Region
}

export interface InterpreterProfile {
  id: string
  name: string
  initials: string
  region: Region
  modes: Mode[]
  specialtyExperience: Record<Specialty, number>
  similarPatientRating: Record<Specialty, number>
  onTimeRate: number
  recentNoShows: number
  weeklyWorkload: number
  continuity: Record<string, number>
  availability: string[]
}

// The demonstration is set on Wednesday 28 October 2026.
export const demoDays = ['Wed 28 Oct', 'Thu 29 Oct', 'Fri 30 Oct', 'Mon 2 Nov', 'Tue 3 Nov']
// The working week of Mon 26 Oct to Sun 1 Nov, from today onwards.
export const currentWeekDays = demoDays.slice(0, 3)

export const slotKey = (day: string, time: string) => `${day} ${time}`
export const splitSlot = (key: string) => {
  const day = demoDays.find((item) => key.startsWith(item)) ?? ''
  return { day, time: key.slice(day.length + 1) }
}
export const slotOrder = (key: string) => {
  const { day, time } = splitSlot(key)
  return demoDays.indexOf(day) * 10000 + Number(time.replace(':', ''))
}

export const demoPatientId = 'pat-alex'

export const patients: Patient[] = [
  { id: 'pat-alex', name: 'Alex Lewis', region: 'London' },
  { id: 'pat-sam', name: 'Sam Morgan', region: 'London' },
  { id: 'pat-jordan', name: 'Jordan Davies', region: 'Manchester' },
  { id: 'pat-bisi', name: 'Bisi Okonjo', region: 'London' },
  { id: 'pat-cara', name: 'Cara Walsh', region: 'Glasgow' },
]

export const doctors: Doctor[] = [
  {
    id: 'doc-bell',
    name: 'Dr Bell',
    specialty: 'Cardiology',
    practice: 'Riverside Surgery',
    slots: ['Thu 29 Oct 09:30', 'Thu 29 Oct 14:15', 'Fri 30 Oct 10:00', 'Fri 30 Oct 20:30', 'Mon 2 Nov 09:00', 'Tue 3 Nov 11:30'],
  },
  {
    id: 'doc-shah',
    name: 'Dr Shah',
    specialty: 'Diabetes',
    practice: 'Northgate Health Centre',
    slots: ['Thu 29 Oct 11:00', 'Fri 30 Oct 13:45', 'Mon 2 Nov 15:00', 'Tue 3 Nov 09:30'],
  },
  {
    id: 'doc-novak',
    name: 'Dr Novak',
    specialty: 'Physiotherapy',
    practice: 'Parkside Clinic',
    slots: ['Thu 29 Oct 16:00', 'Fri 30 Oct 09:00', 'Mon 2 Nov 11:00', 'Tue 3 Nov 14:00'],
  },
]

export const interpreterProfiles: InterpreterProfile[] = [
  {
    id: 'int-amara', name: 'Amara Okafor', initials: 'AO', region: 'London', modes: ['Online', 'In person'],
    specialtyExperience: { Cardiology: 18, Diabetes: 6, Physiotherapy: 3 },
    similarPatientRating: { Cardiology: 4.9, Diabetes: 4.5, Physiotherapy: 4.3 },
    onTimeRate: 0.99, recentNoShows: 0, weeklyWorkload: 9, continuity: { 'pat-alex': 2, 'pat-sam': 3 },
    availability: ['Thu 29 Oct 09:30', 'Thu 29 Oct 14:15', 'Fri 30 Oct 10:00', 'Fri 30 Oct 13:45', 'Fri 30 Oct 20:30', 'Tue 3 Nov 11:30', 'Tue 3 Nov 09:30'],
  },
  {
    id: 'int-tom', name: 'Tom Hughes', initials: 'TH', region: 'Manchester', modes: ['Online'],
    specialtyExperience: { Cardiology: 11, Diabetes: 14, Physiotherapy: 2 },
    similarPatientRating: { Cardiology: 4.7, Diabetes: 4.8, Physiotherapy: 4.1 },
    onTimeRate: 0.97, recentNoShows: 0, weeklyWorkload: 6, continuity: { 'pat-jordan': 4 },
    availability: ['Thu 29 Oct 11:00', 'Thu 29 Oct 14:15', 'Fri 30 Oct 13:45', 'Mon 2 Nov 09:00', 'Tue 3 Nov 09:30', 'Tue 3 Nov 11:30'],
  },
  {
    id: 'int-priya', name: 'Priya Natarajan', initials: 'PN', region: 'London', modes: ['In person'],
    specialtyExperience: { Cardiology: 7, Diabetes: 3, Physiotherapy: 12 },
    similarPatientRating: { Cardiology: 4.6, Diabetes: 4.2, Physiotherapy: 4.7 },
    onTimeRate: 1, recentNoShows: 0, weeklyWorkload: 4, continuity: {},
    availability: ['Thu 29 Oct 14:15', 'Thu 29 Oct 16:00', 'Fri 30 Oct 09:00', 'Fri 30 Oct 10:00', 'Mon 2 Nov 11:00', 'Tue 3 Nov 14:00'],
  },
  {
    id: 'int-callum', name: 'Callum Reid', initials: 'CR', region: 'Glasgow', modes: ['Online', 'In person'],
    specialtyExperience: { Cardiology: 4, Diabetes: 9, Physiotherapy: 15 },
    similarPatientRating: { Cardiology: 4.3, Diabetes: 4.4, Physiotherapy: 4.8 },
    onTimeRate: 0.95, recentNoShows: 0, weeklyWorkload: 11, continuity: { 'pat-cara': 3 },
    availability: ['Thu 29 Oct 16:00', 'Fri 30 Oct 09:00', 'Fri 30 Oct 13:45', 'Mon 2 Nov 09:00', 'Mon 2 Nov 11:00', 'Tue 3 Nov 14:00'],
  },
  {
    id: 'int-nadia', name: 'Nadia Ahmed', initials: 'NA', region: 'London', modes: ['Online'],
    specialtyExperience: { Cardiology: 22, Diabetes: 10, Physiotherapy: 1 },
    similarPatientRating: { Cardiology: 4.5, Diabetes: 4.4, Physiotherapy: 4.0 },
    onTimeRate: 0.88, recentNoShows: 2, weeklyWorkload: 14, continuity: {},
    availability: ['Thu 29 Oct 09:30', 'Thu 29 Oct 14:15', 'Fri 30 Oct 10:00', 'Mon 2 Nov 09:00', 'Tue 3 Nov 11:30'],
  },
]

// What a patient can say they need help with, and the treatment area interpreters are matched on.
export const patientNeeds: Array<{ id: string; label: string; specialty: Specialty }> = [
  { id: 'heart', label: 'Heart, chest pain or blood pressure', specialty: 'Cardiology' },
  { id: 'diabetes', label: 'Blood sugar or diabetes', specialty: 'Diabetes' },
  { id: 'joints', label: 'Joints, muscles or an injury', specialty: 'Physiotherapy' },
]

// Every appointment time any doctor offers, which interpreters can declare themselves free for.
export const allSlots = [...new Set(doctors.flatMap((doctor) => doctor.slots))].sort((a, b) => slotOrder(a) - slotOrder(b))

export const findDoctor = (id: string) => doctors.find((doctor) => doctor.id === id)
export const findPatient = (id: string) => patients.find((patient) => patient.id === id)
export const findInterpreter = (id: string | null) => interpreterProfiles.find((interpreter) => interpreter.id === id)
