import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function AppointmentCalendar({
  monthCursor,
  onMonthChange,
  selectedDate,
  onSelectDate,
  bookedDateKeys,
  className,
}: {
  monthCursor: Date
  onMonthChange: (next: Date) => void
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
  /** YYYY-MM-DD keys that already have bookings */
  bookedDateKeys?: Set<string>
  className?: string
}) {
  const today = startOfDay(new Date())
  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  function dateKey(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  return (
    <div className={cn('rounded-[16px] border border-[#E8E2D6] bg-white p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#073D2C]">
          {monthCursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const now = new Date()
              onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1))
              onSelectDate(startOfDay(now))
            }}
            className="mr-1 rounded-full border border-[#E8E2D6] px-2.5 py-1 text-[11px] font-semibold text-[#073D2C] transition hover:border-[#C5A059] hover:bg-[#FBF7F0]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(new Date(year, month - 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#F3EEE4]"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(new Date(year, month + 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#F3EEE4]"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <span key={`e-${idx}`} className="aspect-square" />
          const disabled = startOfDay(day) < today
          const selected = selectedDate ? sameDay(day, selectedDate) : false
          const isToday = sameDay(day, today)
          const booked = bookedDateKeys?.has(dateKey(day))
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(day)}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-[12px] text-sm font-medium transition',
                disabled && 'cursor-not-allowed text-[#d0d0d0]',
                !disabled && !selected && 'text-[#073D2C] hover:bg-[#F3EEE4]',
                selected && 'bg-[#073D2C] text-white shadow-sm',
                !selected && isToday && !disabled && 'ring-1 ring-[#C5A059]',
              )}
            >
              {day.getDate()}
              {booked ? (
                <span
                  className={cn(
                    'absolute bottom-1.5 h-1 w-1 rounded-full',
                    selected ? 'bg-[#E8D9B8]' : 'bg-[#C5A059]',
                  )}
                />
              ) : null}
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] text-[#8a8a8a]">
        Gold dots mark days that already have appointments.
      </p>
    </div>
  )
}
