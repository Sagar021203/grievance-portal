import { Heart, MailCheck, X } from 'lucide-react'
import { NativeDialog } from './NativeDialog'

interface SuccessDialogProps {
  open: boolean
  recipientName: string
  onClose: () => void
  onViewRegister: () => void
}

export function SuccessDialog({ open, recipientName, onClose, onViewRegister }: SuccessDialogProps) {
  const finish = () => {
    onClose()
    onViewRegister()
  }

  return (
    <NativeDialog open={open} onClose={onClose} labelledBy="success-title" className="success-dialog">
      <div className="success-paper">
        <button className="icon-button success-close" type="button" onClick={onClose} aria-label="Close confirmation"><X size={19} /></button>
        <div className="success-envelope" aria-hidden="true">
          <div className="envelope-back" />
          <div className="letter-slip"><Heart size={27} strokeWidth={1.4} /></div>
          <div className="envelope-front" />
          <div className="wax-seal"><Heart size={17} fill="currentColor" /></div>
          <span className="spark spark-one">✳</span><span className="spark spark-two">✳</span>
        </div>
        <div className="success-copy">
          <span className="success-label"><MailCheck size={15} /> DELIVERED TO THE RIGHT DESK</span>
          <h2 id="success-title">Your voice will be heard, <em>love.</em></h2>
          <p>Your grievance is officially on the record and has been sent to <strong>{recipientName}</strong>. Their response is now pending. Please try to look patient.</p>
        </div>
        <button className="submit-button success-action" type="button" onClick={finish}>Back to the register <Heart size={15} fill="currentColor" /></button>
        <span className="success-footnote">FILED WITH LOVE · NEVER WITH JUDGEMENT</span>
      </div>
    </NativeDialog>
  )
}
