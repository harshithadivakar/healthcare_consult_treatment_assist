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
  { id: 'pre-2', number: 2, role: 'patient', phase: 'pre', title: 'Answers in BSL or text', detail: 'Typed answers go straight to the doctor. A BSL recording goes to an interpreter.', handoff: 'interpreter' },
  { id: 'pre-3', number: 3, role: 'interpreter', phase: 'pre', title: 'Takes the translation job', detail: 'Offered to the best-matched interpreters with the fee. One accepts and translates within the agreed window.', handoff: 'doctor' },
  { id: 'pre-4', number: 4, role: 'doctor', phase: 'pre', title: 'Reviews interpreted answers', detail: 'Reads the English interpretation before the appointment.' },
  { id: 'con-1', number: 5, role: 'patient', phase: 'consult', title: 'Chooses an interpreter', detail: 'Picks from interpreters recommended for patients with a similar treatment history. Books an online call or in-person visit.', handoff: 'interpreter' },
  { id: 'con-2', number: 6, role: 'interpreter', phase: 'consult', title: 'Interprets live', detail: 'Booked from their declared availability. Joins the video call or attends in person.', handoff: 'doctor' },
  { id: 'con-3', number: 7, role: 'doctor', phase: 'consult', title: 'Consults and takes notes', detail: 'Notes are captured in the app for the patient to refer back to.', handoff: 'patient' },
  { id: 'post-1', number: 8, role: 'doctor', phase: 'post', title: 'Sends follow-up', detail: 'Check-in questions or instructions after the appointment.', handoff: 'patient' },
  { id: 'post-2', number: 9, role: 'patient', phase: 'post', title: 'Replies in BSL or text', detail: 'Typed replies go straight to the doctor. A recording goes to an interpreter.', handoff: 'interpreter' },
  { id: 'post-3', number: 10, role: 'interpreter', phase: 'post', title: 'Takes the follow-up job', detail: 'Chooses whether to accept, then returns the translation within the agreed window.', handoff: 'doctor' },
  { id: 'close-1', number: 11, role: 'patient', phase: 'close', title: 'Rates the interpreter', detail: 'Feedback improves future matches.' },
  { id: 'close-2', number: 12, role: 'interpreter', phase: 'close', title: 'Rates patient and doctor', detail: 'Two-way feedback keeps the service fair.' },
  { id: 'close-3', number: 13, role: 'doctor', phase: 'close', title: 'Rates the interpreter', detail: 'Clinical clarity and timeliness.' },
]

export const consultationNotes = [
  { date: 'Mon 26 Oct', doctor: 'Dr Bell', interpreter: 'Amara Okafor', summary: 'Blood pressure check. Continue ramipril 5 mg each morning. Blood test booked for next week.', deletesIn: '5 days' },
]
