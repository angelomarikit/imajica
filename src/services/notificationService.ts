import { toast } from 'sonner'

export type NotificationChannel = 'sms' | 'email' | 'push'

export interface NotificationPayload {
  channel: NotificationChannel
  to: string
  templateKey: string
  variables?: Record<string, string>
}

/**
 * Abstraction for SMS / email / push.
 * Providers are wired via env-backed adapters; demo mode logs only.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  // In production, call a Supabase Edge Function that holds provider secrets.
  console.info('[notificationService]', payload)
  toast.message(`Notification queued (${payload.channel})`, {
    description: payload.templateKey,
  })
}

export const notificationTemplates = {
  appointment_confirmation: 'Your appointment is confirmed for {{datetime}} at {{branch}}.',
  appointment_reminder: 'Reminder: {{treatment}} tomorrow at {{time}}.',
  payment_confirmation: 'Payment of {{amount}} received. Thank you!',
  package_expiration: 'Your package {{package}} expires on {{date}}.',
} as const
