"use client"

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { industryOptions } from '@/lib/quote/industries'

export default function OnboardingPage() {
  const router = useRouter()
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
    try {
      const stored = localStorage.getItem('QUOTE_INDUSTRY')
      if (stored) {
        router.replace('/quote/new')
      }
    } catch {}
  }, [router])

  const handleSelect = (industryId: string) => {
    try { localStorage.setItem('QUOTE_INDUSTRY', industryId) } catch {}
    router.push('/quote/new')
  }

  if (!isHydrated) {
    return <div className="quote-layout-loading">Loading…</div>
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="quote-entry-label">Welcome to Instant Quote</div>
        <h1>Choose your industry</h1>
        <p className="onboarding-subtitle">We’ll preload the tools and services you sell every day. You can change this anytime.</p>
        <div className="industry-grid">
          {industryOptions.map((industry) => (
            <button
              key={industry.id}
              className="industry-card"
              onClick={() => handleSelect(industry.id)}
            >
              <div className="industry-card-title">{industry.name}</div>
              <div className="industry-card-hero">{industry.hero}</div>
              <div className="industry-card-desc">{industry.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
