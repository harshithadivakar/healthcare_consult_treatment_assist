import { ArrowRight, ChatCircleText, HandWaving, Hourglass, Stethoscope, Timer, Trash, UserCircle, WarningOctagon } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { journeySteps, phases, roleLabels } from '../data/careJourney'
import type { Phase, Role } from '../data/careJourney'

export const roleIcons: Record<Role, Icon> = {
  patient: UserCircle,
  interpreter: HandWaving,
  doctor: Stethoscope,
}

const roles: Role[] = ['patient', 'interpreter', 'doctor']
// Lanes follow the order the work starts in: the doctor sends, the patient answers, the interpreter returns.
const lanes: Role[] = ['doctor', 'patient', 'interpreter']

const roleHints: Record<Role, string> = {
  patient: 'Book slots, choose an interpreter, answer questionnaires',
  interpreter: 'Calendar, deadlines and recommended tasks',
  doctor: 'Schedule, patients, interpreters and messages',
}

const safeguards: Record<Phase, { icon: Icon; title: string; detail: string; tone?: 'danger' }> = {
  pre: { icon: Timer, title: 'Agreed window', detail: 'Interpretation must reach the doctor before the agreed deadline.' },
  consult: { icon: WarningOctagon, title: 'Interpreter no-show', detail: 'Patient switches to speech-to-text and text-to-speech so the appointment is not lost. The interpreter drops to last priority for matches.', tone: 'danger' },
  post: { icon: Timer, title: 'Same window applies', detail: 'Follow-up replies use the same agreed deadline.' },
  close: { icon: Trash, title: '7-day record window', detail: 'Tickets or complaints can be raised for 7 days. After that, everything is deleted.' },
}

export function CareJourney({ onOpenRole, onStartConversation }: {
  onOpenRole: (role: Role) => void
  onStartConversation: () => void
}) {
  return (
    <section className="care-journey page-frame" aria-labelledby="care-journey-title">
      <header className="care-hero">
        <div>
          <span className="prototype-kicker">SignBridge care journey</span>
          <h1 id="care-journey-title">One portal for the whole appointment</h1>
          <p>Follow a Deaf patient, their BSL interpreter and their doctor from the first questionnaire to the final rating. Select a person to open their view of the platform.</p>
        </div>
        <div className="role-launchers" aria-label="Open a view of the platform">
          {roles.map((role) => {
            const RoleIcon = roleIcons[role]
            return (
              <button className={`role-launcher role-${role}`} onClick={() => onOpenRole(role)} key={role}>
                <span className="role-avatar"><RoleIcon size={30} weight="duotone" /></span>
                <span><strong>{roleLabels[role]} view</strong><small>{roleHints[role]}</small></span>
                <ArrowRight size={20} weight="bold" />
              </button>
            )
          })}
        </div>
      </header>

      <div className="flow-board" role="region" aria-label="Care journey flow diagram">
        <div className="flow-lanes">
          <span className="flow-corner">Who</span>
          {lanes.map((role) => {
            const RoleIcon = roleIcons[role]
            return (
              <button className={`flow-lane-label role-${role}`} onClick={() => onOpenRole(role)} aria-label={`Open the ${roleLabels[role].toLowerCase()} view`} key={role}>
                <RoleIcon size={22} weight="duotone" />{roleLabels[role]}
              </button>
            )
          })}
          <span className="flow-lane-label role-safeguard"><Hourglass size={22} weight="duotone" />Safeguards</span>
        </div>

        {phases.map((phase, phaseIndex) => (
          <section className={`flow-phase phase-${phase.id}`} aria-labelledby={`phase-${phase.id}`} key={phase.id}>
            <header className="flow-phase-heading">
              <span className="flow-phase-index">{phaseIndex + 1}</span>
              <div><h2 id={`phase-${phase.id}`}>{phase.label}</h2><p>{phase.summary}</p></div>
              {phaseIndex < phases.length - 1 && <ArrowRight className="flow-phase-arrow" size={22} weight="bold" aria-hidden="true" />}
            </header>
            {lanes.map((role) => {
              const RoleIcon = roleIcons[role]
              const steps = journeySteps.filter((step) => step.phase === phase.id && step.role === role)
              return (
                <div className={`flow-cell role-${role}`} key={role}>
                  <button className="flow-cell-role" onClick={() => onOpenRole(role)} aria-label={`Open the ${roleLabels[role].toLowerCase()} view`}>
                    <RoleIcon size={20} weight="duotone" />
                  </button>
                  {steps.map((step) => (
                    <article className="flow-step" key={step.id}>
                      <span className="flow-step-number" aria-label={`Step ${step.number}`}>{step.number}</span>
                      <div>
                        <h3>{step.title}</h3>
                        <p>{step.detail}</p>
                        {step.handoff && step.handoff !== 'everyone' && (
                          <span className={`flow-handoff role-${step.handoff}`}><ArrowRight size={14} weight="bold" />{roleLabels[step.handoff]}</span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )
            })}
            <SafeguardCell phase={phase.id} />
          </section>
        ))}
      </div>

      <div className="care-footer">
        <p><ChatCircleText size={22} />Already in the room together? Use in-room conversation support for short, low-risk exchanges.</p>
        <button className="secondary-button" onClick={onStartConversation}>In-room conversation support <ArrowRight size={20} weight="bold" /></button>
      </div>
    </section>
  )
}

function SafeguardCell({ phase }: { phase: Phase }) {
  const { icon: SafeguardIcon, title, detail, tone } = safeguards[phase]
  return (
    <div className={`flow-cell role-safeguard ${tone === 'danger' ? 'safeguard-danger' : ''}`}>
      <SafeguardIcon size={22} weight="duotone" />
      <div><h3>{title}</h3><p>{detail}</p></div>
    </div>
  )
}
