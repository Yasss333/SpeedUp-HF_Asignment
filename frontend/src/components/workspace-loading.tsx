import { useEffect, useState } from "react"

const messages = [
  "Opening your workspace",
  "Gathering your conversations",
  "Getting your inbox ready",
  "A little more time for the important stuff",
]

export function WorkspaceLoading() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % messages.length)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <p className="text-sm text-muted-foreground" role="status">
      <span className="sr-only">Loading your demo workspace</span>
      <span key={step} aria-hidden="true" className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
        {messages[step]}…
      </span>
    </p>
  )
}
