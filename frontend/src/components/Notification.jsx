import { CheckCircle2, CircleAlert, X } from 'lucide-react'

export default function Notification({ notification, onClose }) {
  if (!notification) return null
  const Icon = notification.type === 'error' ? CircleAlert : CheckCircle2
  return (
    <div className={`notification glass ${notification.type}`} role={notification.type === 'error' ? 'alert' : 'status'} aria-live="polite">
      <Icon aria-hidden="true" />
      <span>{notification.message}</span>
      <button className="icon-button" type="button" onClick={onClose} aria-label="Dismiss notification"><X aria-hidden="true" /></button>
    </div>
  )
}

