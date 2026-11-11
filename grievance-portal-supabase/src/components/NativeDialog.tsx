import { useEffect, useRef, type ReactNode } from 'react'

interface NativeDialogProps {
  open: boolean
  onClose: () => void
  labelledBy: string
  className?: string
  children: ReactNode
}

export function NativeDialog({ open, onClose, labelledBy, className = '', children }: NativeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className={`native-dialog ${className}`}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close()
      }}
    >
      {children}
    </dialog>
  )
}
