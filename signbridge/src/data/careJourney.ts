// Fictional demonstration data for the SignBridge care journey. No real people or services.

export type Role = 'patient' | 'interpreter' | 'doctor'
export type Phase = 'pre' | 'consult' | 'post' | 'close'

export interface JourneyStep {
  id: string
  number: number
  role: Role
  phase: Phase
  title: string
  detail: string
  handoff?: Role | 'everyone'
}

export const roleLabels: Record<Role, string> = {
  patient: 'Patient',
  interpreter: 'BSL interpreter',
  doctor: 'Doctor',
}

export const phases: Array<{ id: Phase; label: string; summary: string }> = [
  { id: 'pre', label: 'Pre-consultation', summary: 'Questionnaire answered in BSL and interpreted before the appointment.' },
  { id: 'consult', label: 'Consultation', summary: 'Patient picks an interpreter and attends online or in person.' },
  { id: 'post', label: 'Post-consultation', summary: 'Follow-up questions travel the same way as the pre-consultation.' },
  { id: 'close', label: 'Rate and close', summary: 'Everyone rates each other. Records are kept for 7 days, then deleted.' },
]

export const journeySteps: JourneyStep[] = [
  { id: 'pre-1', number: 1, role: 'doctor', phase: 'pre', title: 'Sends a questionnaire', detail: 'Pre-consultation questions go to the patient through the portal.', handoff: 'patient' },
  { id: 'pre-2', number: 2, role: 'patient', phase: 'pre', title: 'Records answers in BSL', detail: 'Signs the answers on camera, or types them, then presses Send.', handoff: 'interpreter' },
  { id: 'pre-3', number: 3, role: 'interpreter', phase: 'pre', title: 'Matched and interprets', detail: 'Best-fit interpreter is chosen from availability and past performance. Interprets within the agreed window.', handoff: 'doctor' },
  { id: 'pre-4', number: 4, role: 'doctor', phase: 'pre', title: 'Reviews interpreted answers', detail: 'Reads the English interpretation before the appointment.' },
  { id: 'con-1', number: 5, role: 'patient', phase: 'consult', title: 'Chooses an interpreter', detail: 'Picks from interpreters recommended for patients with a similar treatment history. Books an online call or in-person visit.', handoff: 'interpreter' },
  { id: 'con-2', number: 6, role: 'interpreter', phase: 'consult', title: 'Interprets live', detail: 'Joins the video call or attends in person.', handoff: 'doctor' },
  { id: 'con-3', number: 7, role: 'doctor', phase: 'consult', title: 'Consults and takes notes', detail: 'Notes are captured in the app for the patient to refer back to.', handoff: 'patient' },
  { id: 'post-1', number: 8, role: 'doctor', phase: 'post', title: 'Sends follow-up', detail: 'Check-in questions or instructions after the appointment.', handoff: 'patient' },
  { id: 'post-2', number: 9, role: 'patient', phase: 'post', title: 'Replies in BSL or text', detail: 'Records or types a response and sends it.', handoff: 'interpreter' },
  { id: 'post-3', number: 10, role: 'interpreter', phase: 'post', title: 'Interprets the reply', detail: 'Returns the interpretation to the doctor within the agreed window.', handoff: 'doctor' },
  { id: 'close-1', number: 11, role: 'patient', phase: 'close', title: 'Rates the interpreter', detail: 'Feedback improves future matches.' },
  { id: 'close-2', number: 12, role: 'interpreter', phase: 'close', title: 'Rates patient and doctor', detail: 'Two-way feedback keeps the service fair.' },
  { id: 'close-3', number: 13, role: 'doctor', phase: 'close', title: 'Rates the interpreter', detail: 'Clinical clarity and timeliness.' },
]

export const matchingFactors = [
  { label: 'Declared availability', detail: 'Free during the deadline window or appointment slot.' },
  { label: 'Performance with past patients', detail: 'Ratings from patients and doctors after previous jobs.' },
  { label: 'Similar treatment history', detail: 'Experience with patients on a similar care pathway.' },
  { label: 'Reliability', detail: 'Deadlines met and appointments attended. A no-show moves the interpreter to last priority.' },
]

export interface Interpreter {
  id: string
  name: string
  initials: string
  rating: number
  similarCases: number
  onTime: number
  modes: Array<'Online' | 'In person'>
  note: string
}

export const interpreters: Interpreter[] = [
  { id: 'int-1', name: 'Amara Okafor', initials: 'AO', rating: 4.9, similarCases: 18, onTime: 99, modes: ['Online', 'In person'], note: 'Strongest record with cardiology patients' },
  { id: 'int-2', name: 'Tom Hughes', initials: 'TH', rating: 4.7, similarCases: 11, onTime: 97, modes: ['Online'], note: 'Rated highly for clear medication explanations' },
  { id: 'int-3', name: 'Priya Natarajan', initials: 'PN', rating: 4.6, similarCases: 7, onTime: 100, modes: ['In person'], note: 'Never missed an appointment' },
]

export interface Slot {
  id: string
  day: string
  time: string
  interpretersFree: number
}

export const appointmentSlots: Slot[] = [
  { id: 's1', day: 'Thu 29 Oct', time: '09:30', interpretersFree: 3 },
  { id: 's2', day: 'Thu 29 Oct', time: '11:00', interpretersFree: 0 },
  { id: 's3', day: 'Thu 29 Oct', time: '14:15', interpretersFree: 2 },
  { id: 's4', day: 'Fri 30 Oct', time: '10:00', interpretersFree: 1 },
  { id: 's5', day: 'Fri 30 Oct', time: '13:45', interpretersFree: 3 },
  { id: 's6', day: 'Mon 2 Nov', time: '09:00', interpretersFree: 2 },
]

export type CalendarKind = 'pre-deadline' | 'post-deadline' | 'appointment'

export interface CalendarItem {
  id: string
  day: string
  time: string
  kind: CalendarKind
  title: string
  detail: string
}

export const calendarDays = ['Mon 26', 'Tue 27', 'Wed 28', 'Thu 29', 'Fri 30']

export const interpreterCalendar: CalendarItem[] = [
  { id: 'c1', day: 'Mon 26', time: '10:00', kind: 'appointment', title: 'Consultation · Online', detail: 'Patient R.K. with Dr Bell' },
  { id: 'c2', day: 'Tue 27', time: '17:00', kind: 'post-deadline', title: 'Post-consult due', detail: 'Patient R.K. follow-up reply' },
  { id: 'c3', day: 'Wed 28', time: '12:00', kind: 'pre-deadline', title: 'Pre-consult due', detail: 'Patient S.M. questionnaire' },
  { id: 'c4', day: 'Wed 28', time: '15:30', kind: 'appointment', title: 'Consultation · In person', detail: 'Patient J.D. with Dr Shah, Riverside Surgery' },
  { id: 'c5', day: 'Thu 29', time: '09:30', kind: 'appointment', title: 'Consultation · Online', detail: 'Patient S.M. with Dr Bell' },
  { id: 'c6', day: 'Fri 30', time: '12:00', kind: 'post-deadline', title: 'Post-consult due', detail: 'Patient J.D. follow-up reply' },
]

export interface InterpretationTask {
  id: string
  kind: 'Pre-consultation' | 'Post-consultation' | 'Consultation'
  patient: string
  due: string
  length: string
  score: number
  reasons: string[]
  calendar: Omit<CalendarItem, 'id'>
}

export const recommendedTasks: InterpretationTask[] = [
  { id: 't1', kind: 'Pre-consultation', patient: 'Patient A.L. · Cardiology', due: 'Due Thu 29 Oct, 12:00', length: '4 min BSL video', score: 94, reasons: ['Free before the deadline', '4.9 average from 18 similar patients', 'No missed deadlines this year'], calendar: { day: 'Thu 29', time: '12:00', kind: 'pre-deadline', title: 'Pre-consult due', detail: 'Patient A.L. questionnaire' } },
  { id: 't2', kind: 'Consultation', patient: 'Patient B.O. · Diabetes review', due: 'Fri 30 Oct, 13:45 · Online', length: '30 min call', score: 88, reasons: ['Matches your declared Friday hours', 'Patient rated you 5 stars last visit'], calendar: { day: 'Fri 30', time: '13:45', kind: 'appointment', title: 'Consultation · Online', detail: 'Patient B.O. with Dr Shah' } },
  { id: 't3', kind: 'Post-consultation', patient: 'Patient C.W. · Physiotherapy', due: 'Due Fri 30 Oct, 17:00', length: '2 min BSL video', score: 81, reasons: ['Free before the deadline', 'Experience with musculoskeletal follow-ups'], calendar: { day: 'Fri 30', time: '17:00', kind: 'post-deadline', title: 'Post-consult due', detail: 'Patient C.W. follow-up reply' } },
]

export interface DoctorAppointment {
  id: string
  time: string
  patient: string
  interpreter: string
  mode: 'Online' | 'In person'
  preConsult: 'Interpreted' | 'With interpreter' | 'Awaiting patient'
}

export const doctorSchedule: DoctorAppointment[] = [
  { id: 'd1', time: '09:30', patient: 'Sam Morgan', interpreter: 'Amara Okafor', mode: 'Online', preConsult: 'Interpreted' },
  { id: 'd2', time: '11:00', patient: 'Jordan Davies', interpreter: 'Tom Hughes', mode: 'Online', preConsult: 'With interpreter' },
  { id: 'd3', time: '14:15', patient: 'Alex Lewis', interpreter: 'Not chosen yet', mode: 'In person', preConsult: 'Awaiting patient' },
]

export interface PortalMessage {
  id: string
  from: string
  to: string
  subject: string
  body: string
  time: string
  kind: 'questionnaire' | 'interpretation' | 'note' | 'message'
}

export const doctorInbox: PortalMessage[] = [
  { id: 'm1', from: 'Amara Okafor (interpreter)', to: 'Dr Bell', subject: 'Interpretation: Sam Morgan pre-consultation', body: 'Chest tightness for three days, worse on stairs. No known allergies. Takes ramipril each morning. Would like to discuss sleep.', time: 'Today 08:12', kind: 'interpretation' },
  { id: 'm2', from: 'Jordan Davies (patient)', to: 'Dr Bell', subject: 'Running 5 minutes late', body: 'Typed message: My bus is delayed, I will join the call at 11:05.', time: 'Today 08:40', kind: 'message' },
]

export const patientQuestionnaire = {
  from: 'Dr Bell, Riverside Surgery',
  subject: 'Before your appointment on Thu 29 Oct',
  questions: [
    'What symptoms are you having, and when did they start?',
    'Are you taking any medicines at the moment?',
    'Is there anything else you would like to talk about?',
  ],
}

export const consultationNotes = [
  { date: 'Mon 26 Oct', doctor: 'Dr Bell', interpreter: 'Amara Okafor', summary: 'Blood pressure check. Continue ramipril 5 mg each morning. Blood test booked for next week.', deletesIn: '5 days' },
]
