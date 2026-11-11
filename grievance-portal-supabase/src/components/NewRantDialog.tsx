import { useEffect, useState, type FormEvent } from 'react'
import { Heart, Send, X } from 'lucide-react'
import { CATEGORIES, SEVERITIES, type Category, type NewComplaintInput, type Person, type Severity } from '../types'
import { NativeDialog } from './NativeDialog'
import { FallingLeavesOverlay } from './FallingLeavesOverlay'

interface NewRantDialogProps {
  open: boolean
  people: Person[]
  currentUserId: string
  onClose: () => void
  onSubmit: (complaint: NewComplaintInput) => Promise<void>
}

export function NewRantDialog({ open, people, currentUserId, onClose, onSubmit }: NewRantDialogProps) {
  const recipients = people.filter((person) => person.id !== currentUserId)
  const [recipientId, setRecipientId] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('Attention')
  const [body, setBody] = useState('')
  const [severity, setSeverity] = useState<Severity>('A tiny inconvenience')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setRecipientId(recipients[0]?.id ?? '')
      setError('')
    }
  }, [open, people.length, currentUserId])

  const reset = () => {
    setTitle('')
    setCategory('Attention')
    setBody('')
    setSeverity('A tiny inconvenience')
    setError('')
    setSubmitting(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!recipientId) {
      setError('There needs to be someone on the receiving end of this very important document.')
      return
    }
    if (title.trim().length < 4 || body.trim().length < 12) {
      setError('Give the other person a little more to work with, love.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        recipientId,
        title: title.trim(),
        category,
        body: body.trim(),
        severity,
      })
      reset()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The courier had a little trouble. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }
  useEffect(()=>{
    console.log("person id", recipients)
  },[])

  return (
    <NativeDialog open={open} onClose={close} labelledBy="rant-title" className="form-dialog">
      <div className="dialog-paper form-paper">
        <FallingLeavesOverlay />
        <div className="dialog-topline">
          <div className="mini-seal"><Heart size={15} strokeWidth={1.8} /></div>
          <span className="document-label">FORM DUS–01 · PRIVATE & VERY IMPORTANT</span>
          <button className="icon-button" type="button" onClick={close} aria-label="Close new rant form"><X size={19} /></button>
        </div>
        <div className="form-intro">
          <h2 id="rant-title">Let it <em>out.</em></h2>
          <p>No need to make it sound reasonable. That is quite literally not the point.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label className="field-label" htmlFor="rant-recipient">Address this grievance to</label>
          <select id="rant-recipient" className="text-field" value={recipientId} onChange={(event) => setRecipientId(event.target.value)} required disabled={recipients.length === 0}>
            {recipients.length === 0 && <option value="">No other members on the register yet</option>}
            {recipients.map((person) => <option value={person.id} key={person.id}>{person.display_name} · {person.role === 'department' ? 'Department' : 'Supreme Overlord'} · @{person.username}</option>)}
          </select>
          {recipients.length === 0 && <p className="recipient-hint">The other person needs to create their account first. Once they join, they will appear here automatically.</p>}

          <label className="field-label" htmlFor="rant-subject">What are we calling this case?</label>
          <input id="rant-subject" className="text-field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. The great pillow displacement" maxLength={90} required autoFocus />

          <div className="field-grid">
            <div>
              <label className="field-label" htmlFor="rant-category">Category</label>
              <select id="rant-category" className="text-field" value={category} onChange={(event) => setCategory(event.target.value as Category)}>
                {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="rant-severity">Dramatic rating</label>
              <select id="rant-severity" className="text-field" value={severity} onChange={(event) => setSeverity(event.target.value as Severity)}>
                {SEVERITIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <label className="field-label" htmlFor="rant-story">And what, exactly, happened?</label>
          <textarea id="rant-story" className="text-field text-area" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Start from the beginning. Include unnecessary details. We are listening." rows={5} maxLength={1200} required />
          <div className="form-footnote"><span>{body.length}/1200 characters</span><span>All feelings are admissible.</span></div>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="submit-button" type="submit" disabled={submitting || recipients.length === 0}>
            <span>{submitting ? 'Sending with care…' : 'Send the grievance'}</span>{submitting ? <span className="button-spinner" /> : <Send size={16} />}
          </button>
          <p className="privacy-note"><Heart size={12} fill="currentColor" /> Delivered privately to the person you choose. Never used against you during arguments.</p>
        </form>
      </div>
    </NativeDialog>
  )
}
