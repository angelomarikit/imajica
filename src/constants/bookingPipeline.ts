export const BOOKING_BUCKETS = ['show', 'cancelled', 'pending', 'rescheduled'] as const

export type BookingBucket = (typeof BOOKING_BUCKETS)[number]

export type BookingBucketMeta = {
  label: string
  shortLabel: string
  owner: 'Clinic' | 'CSR'
  ownerNote: string
  /** CSR call script. Show is owned by the clinic and has none. */
  script: string | null
}

export const BOOKING_BUCKET_META: Record<BookingBucket, BookingBucketMeta> = {
  show: {
    label: 'Show',
    shortLabel: 'Show',
    owner: 'Clinic',
    ownerNote: 'The clinic handles arrival, treatment, and checkout.',
    script: null,
  },
  cancelled: {
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    owner: 'CSR',
    ownerNote: 'CSR follows up. Includes no-shows.',
    script:
      'Confirm the cancellation and the reason. Offer the next open slot at their clinic. If they did not show, ask whether they want to rebook this week.',
  },
  pending: {
    label: 'Pending',
    shortLabel: 'Pending',
    owner: 'CSR',
    ownerNote: 'CSR confirms the visit before the clinic sees them.',
    script:
      'Confirm the client’s name, clinic, date, and time. Ask if they need directions or want to move the visit. Remind them to arrive a few minutes early.',
  },
  rescheduled: {
    label: 'Rescheduled',
    shortLabel: 'Resched',
    owner: 'CSR',
    ownerNote: 'CSR confirms the new time. The replacement visit is a new pending booking.',
    script:
      'Confirm the new date, time, and clinic. Repeat what changed from the previous slot. Ask them to say so if the new time does not work.',
  },
}

export function isBookingBucket(value: string | null | undefined): value is BookingBucket {
  return BOOKING_BUCKETS.includes(value as BookingBucket)
}

export function formatAppointmentStatus(status: string) {
  return status.replaceAll('_', ' ')
}
