import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function EnterQuantityModal({
  open,
  itemName,
  onClose,
  onConfirm,
}: {
  open: boolean
  itemName: string
  onClose: () => void
  onConfirm: (quantity: number) => void
}) {
  const [quantity, setQuantity] = useState('1')

  useEffect(() => {
    if (open) setQuantity('1')
  }, [open, itemName])

  if (!open) return null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const n = Math.max(1, Math.floor(Number(quantity) || 1))
    onConfirm(n)
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#041c18]/45 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enter-qty-title"
        className="relative z-10 w-full max-w-md rounded-[16px] bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-ui hover:bg-ivory-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="enter-qty-title" className="text-center text-xl font-bold text-[#1e293b]">
          Enter Quantity
        </h2>
        <p className="mt-3 text-center text-sm text-slate-ui">
          How many sessions of <span className="font-semibold text-[#073D2C]">{itemName}</span> would
          you like to book?
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <input
            type="number"
            min={1}
            step={1}
            className="h-12 w-full rounded-[10px] border border-border bg-white px-4 text-center text-lg font-semibold text-[#073D2C] outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            autoFocus
          />
          <div className="flex gap-3">
            <Button type="submit" className="flex-1">
              Add to Cart
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
