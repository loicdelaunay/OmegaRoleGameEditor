import { X } from 'lucide-react'
import type { StatusNotification } from '../../types/notifications'

export function StatusNotifications({
  notifications,
  onDismiss,
}: {
  notifications: StatusNotification[]
  onDismiss: (id: string) => void
}) {
  if (notifications.length === 0) return null
  return (
    <div className="status-snackbar-stack" aria-live="polite" aria-atomic="false">
      {notifications.map((notification) => (
        <div key={notification.id} className={`status-snackbar surface-base ${notification.tone}`}>
          <span className="status-snackbar-message">{notification.message}</span>
          <button
            type="button"
            className="ghost compact-icon-button status-snackbar-close"
            title="Fermer la notification"
            aria-label="Fermer la notification"
            onClick={() => onDismiss(notification.id)}
          >
            <X className="button-icon" strokeWidth={2.2} />
          </button>
          <span className="status-snackbar-progress" aria-hidden="true" />
        </div>
      ))}
    </div>
  )
}
