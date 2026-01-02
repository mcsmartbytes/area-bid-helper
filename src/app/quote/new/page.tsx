"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuoteStore } from "@/lib/quote/store"

export default function NewQuotePage() {
  const router = useRouter()
  const [address, setAddress] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const setQuoteAddress = useQuoteStore((s) => s.setQuoteAddress)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = address.trim()
    if (!value) {
      setError("Enter a job address to start a quote")
      return
    }
    setError(null)
    setIsSubmitting(true)
    setQuoteAddress(value)
    const params = new URLSearchParams({ address: value })
    router.push(`/quote/map?${params.toString()}`)
  }

  return (
    <div className="quote-entry">
      <div className="quote-entry-card">
        <div className="quote-entry-label">Instant Quote (Map)</div>
        <h1>Create Quote</h1>
        <p>Start every bid by locking in the job address. Nothing else.</p>
        <form className="quote-entry-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="job-address">Job address</label>
          <input
            id="job-address"
            type="text"
            placeholder="123 Main St, Austin TX"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={isSubmitting}
            className={error ? "input-error" : undefined}
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Loading map…" : "Start Quote"}
          </button>
        </form>
      </div>
    </div>
  )
}
