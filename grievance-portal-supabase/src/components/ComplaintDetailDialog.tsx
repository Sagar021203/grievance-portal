import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowUpRight, CheckCircle2, Heart, MessageCircleHeart, Send, ShieldCheck, X } from 'lucide-react'
import type { Complaint } from '../types'
import { NativeDialog } from './NativeDialog'
import { FallingLeavesOverlay } from './FallingLeavesOverlay'

interface ComplaintDetailDialogProps {
  complaint: Complaint | null
  currentUserId: string
  onClose: () => void
  onReply: (body: string) => Promise<void>
  onFinish: () => Promise<void>
  onShareWhatsApp: () => void
}

function readableDate(date: string) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date))
}

function statusCopy(status: Complaint['status'], isSender: boolean) {
  if (status === 'closed') return 'The matter has been lovingly put to rest.'
  if (status === 'awaiting_acknowledgement') return isSender ? 'A reply is waiting. Your move, Supreme Leader.' : 'Your official statement has been dispatched. Awaiting a verdict.'
  return isSender ? 'The recipient has been notified. Patience is a virtue.' : 'An official response is now due. The floor is yours.'
}

export function ComplaintDetailDialog({ complaint, currentUserId, onClose, onReply, onFinish, onShareWhatsApp }: ComplaintDetailDialogProps) {
  const [replyBody, setReplyBody] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)
  const [finishBusy, setFinishBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setReplyBody('')
    setError('')
    setReplyBusy(false)
    setFinishBusy(false)
  }, [complaint?.id])

  const isSender = complaint?.sender_id === currentUserId
  const isRecipient = complaint?.recipient_id === currentUserId
  const canReply = Boolean(isRecipient && complaint?.status === 'awaiting_response' && !complaint.reply)
  const canFinish = Boolean(isSender && complaint?.status === 'awaiting_acknowledgement' && complaint.reply)

  const handleReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (replyBody.trim().length < 2) {
      setError('Even an official statement needs at least two characters.')
      return
    }
    setReplyBusy(true)
    setError('')
    try {
      await onReply(replyBody.trim())
      setReplyBody('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The reply could not be delivered. Please try again.')
    } finally {
      setReplyBusy(false)
    }
  }

  const handleFinish = async () => {
    setFinishBusy(true)
    setError('')
    try {
      await onFinish()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The Department could not close this file just yet.')
    } finally {
      setFinishBusy(false)
    }
  }

  return (
    <NativeDialog open={Boolean(complaint)} onClose={onClose} labelledBy="detail-title" className="detail-dialog">
      {complaint && (
        <article className="dialog-paper detail-paper">
          <FallingLeavesOverlay />
          <div className="detail-toolbar">
            <button className="back-button" type="button" onClick={onClose}><ArrowLeft size={15} /> Back to register</button>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close complaint"><X size={19} /></button>
          </div>
          <div className="detail-document-head">
            <span className="document-label">OFFICE OF US · CASE FILE</span>
            <span className="case-reference">{complaint.reference}</span>
          </div>
          <div className="detail-tags">
            <span className="category-tag">{complaint.category}</span>
            <span className={`status-tag status-${complaint.status.replace(/_/g, '-')}`}>
              {complaint.status === 'awaiting_response' ? 'Awaiting response' : complaint.status === 'awaiting_acknowledgement' ? (isSender ? 'Your verdict, please' : 'Awaiting sender verdict') : 'Drama concluded'}
            </span>
          </div>
          <h2 id="detail-title" className="detail-title">{complaint.title}</h2>
          <div className="detail-meta"><span>Filed {readableDate(complaint.created_at)}</span><span className="meta-dot" /><span>{complaint.severity}</span></div>

          <div className="case-parties">
            <div><span>{complaint.sender.role === 'department' ? 'THE DEPARTMENT · FILED BY' : 'THE USER · FILED BY'}</span><strong>{complaint.sender.display_name}</strong><small>@{complaint.sender.username}</small></div>
            <div className="case-parties-arrow"><ArrowUpRight size={16} /></div>
            <div><span>{complaint.recipient.role === 'department' ? 'THE DEPARTMENT · ADDRESSED TO' : 'THE USER · ADDRESSED TO'}</span><strong>{complaint.recipient.display_name}</strong><small>@{complaint.recipient.username}</small></div>
          </div>

          <div className="complaint-copy">
            <span className="copy-label">THE OFFICIAL STATEMENT</span>
            <p>{complaint.body}</p>
          </div>

          {complaint.reply ? (
            <div className="response-note response-note-live">
              <div className="response-heading"><MessageCircleHeart size={17} /><span>OFFICIAL RESPONSE · {complaint.recipient.role === 'department' ? 'THE DEPARTMENT' : 'THE USER'}</span></div>
              <p>{complaint.reply.body}</p>
              <div className="response-signature">Filed {readableDate(complaint.reply.created_at)} <Heart size={13} fill="currentColor" /></div>
            </div>
          ) : (
            <div className="response-pending">
              <div className="response-heading"><MessageCircleHeart size={17} /><span>{complaint.recipient.role === 'department' ? "THE DEPARTMENT'S RESPONSE" : "MAALKIN KA RESPONSE"}</span></div>
              <p>{statusCopy(complaint.status, Boolean(isSender))}</p>
            </div>
          )}

          {canReply && (
            <form className="reply-form" onSubmit={handleReply}>
              <label className="field-label" htmlFor="official-reply">Your official statement</label>
              <textarea id="official-reply" className="text-field text-area" rows={4} maxLength={1600} value={replyBody} onChange={(event) => setReplyBody(event.target.value)} placeholder="The Department has reviewed the allegations and would like to say…" required />
              <div className="form-footnote"><span>{replyBody.length}/1600 characters</span><span>Choose your words wisely.</span></div>
              <button className="submit-button reply-submit" type="submit" disabled={replyBusy}><span>{replyBusy ? 'Dispatching your statement…' : 'Send official reply'}</span>{replyBusy ? <span className="button-spinner" /> : <Send size={16} />}</button>
            </form>
          )}

          {canFinish && (
            <div className="case-resolution-actions">
              <p className="resolution-prompt">The response has landed. How would you like to proceed?</p>
              <button className="finish-drama-button" type="button" onClick={handleFinish} disabled={finishBusy}>
                <CheckCircle2 size={16} /><span>{finishBusy ? 'Putting the file to rest…' : 'Finish the drama'}</span>
              </button>
              <button className="whatsapp-button" type="button" onClick={onShareWhatsApp}>
                <Send size={15} /><span>Take this over WhatsApp</span><ArrowUpRight size={14} />
              </button>
            </div>
          )}

          {complaint.status === 'closed' && (
            <div className="closed-note"><ShieldCheck size={17} /><span>Case closed. Peace, reportedly, has been restored.</span></div>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="detail-bottomline"><span>THIS DOCUMENT IS A LOVE LANGUAGE.</span><span>KEEP FOREVER <Heart size={11} /></span></div>
        </article>
      )}
    </NativeDialog>
  )
}
