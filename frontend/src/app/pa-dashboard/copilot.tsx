import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { ArrowUp, ArrowUpRight, Mail, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { api } from "./api"
import { PA_GREETING } from "./pa"
import { useInbox, type Client, type Email } from "./store"

interface Message {
  id: string
  role: "user" | "assistant"
  text: string
  emailIds?: string[]
}
const panelQuery = "(max-width: 1023px)"
function subscribeToPanelWidth(onChange: () => void) {
  const media = window.matchMedia(panelQuery)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}
export function Copilot({
  open,
  onClose,
  client,
  width,
  onWidthChange,
  voiceSlot,
  email,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  client: Client
  width: number
  onWidthChange: (width: number) => void
  voiceSlot: (element: HTMLDivElement | null) => void
  email?: Email
  onSelect: (id: string) => void
}) {
  const mobile = useSyncExternalStore(subscribeToPanelWidth, () => window.matchMedia(panelQuery).matches, () => false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const { emails } = useInbox()
  const [asking, setAsking] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (open && !mobile) inputRef.current?.focus()
  }, [open, mobile])
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" })
  }, [messages])
  useEffect(() => {
    if (!open) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", escape)
    return () => window.removeEventListener("keydown", escape)
  }, [open, onClose])
  async function ask(prompt: string) {
    const text = prompt.trim()
    if (!text || asking) return
    setAsking(true)
    setInput("")
    setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: "user", text },
    ])
    try {
      const history = messages.slice(-8).map(({ role, text }) => ({ role, text }))
      const answer = await api.askCopilot(client.id, text, email?.id, history)
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: "assistant", text: answer.answer, emailIds: answer.email_ids },
      ])
    } catch {
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: "assistant", text: "Copilot couldn't answer right now. Please try again." },
      ])
    } finally {
      setAsking(false)
    }
  }
  if (!open) return null
  const content = (
    <>
      <div className="flex items-center gap-2 border-b p-4">
        <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Speedup Copilot</h2>
          <p className="truncate text-xs text-muted-foreground">
            Inbox tools for {client.name}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Close copilot"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      {!mobile && (
        <label className="flex items-center gap-3 border-b px-4 py-2 text-xs text-muted-foreground">
          Panel width
          <input
            type="range"
            min={320}
            max={512}
            step={8}
            value={width}
            onChange={(event) => onWidthChange(event.currentTarget.valueAsNumber)}
            className="min-w-0 flex-1 accent-indigo-500"
          />
        </label>
      )}
      <div ref={voiceSlot} />
      <div
        className="min-h-0 flex-1 overflow-y-auto p-4"
        role="log"
        aria-label="Copilot conversation"
        aria-live="polite"
      >
        {!messages.length && (
          <div className="py-7">
            <Sparkles className="mb-4 size-7" />
            <h3 className="text-xl font-semibold">
              {PA_GREETING}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Review priorities, find unanswered threads, or work on a reply
              without leaving your inbox.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Workspace tools use your current inbox and triage results.
            </p>
          </div>
        )}
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-7 rounded-2xl bg-muted p-3 text-sm"
                  : "space-y-3 py-2 text-sm leading-6"
              }
            >
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
              {message.emailIds?.map((id) => {
                const item = emails.find((row) => row.id === id)
                return (
                  item && (
                    <button
                      key={id}
                      className="flex w-full items-center gap-2 rounded-lg border p-3 text-left text-xs hover:bg-muted focus-visible:outline-ring"
                      onClick={() => {
                        onSelect(id)
                        if (mobile) onClose()
                      }}
                    >
                      <Mail className="size-4 shrink-0" />
                      <span className="min-w-0 truncate">{item.subject}</span>
                      <ArrowUpRight className="ml-auto size-3 shrink-0" />
                    </button>
                  )
                )
              })}
            </div>
          ))}
        </div>
        {asking && <p className="mt-3 text-sm text-muted-foreground">Reviewing this inbox…</p>}
        <div ref={endRef} />
      </div>
      <div className="space-y-3 border-t p-4">
        {email && (
          <p className="truncate text-xs text-muted-foreground">
            Selected: {email.subject}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {[
            "Summarize my inbox",
            "High-priority emails",
            "Read without reply",
            "Show suggested reply",
          ].map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              size="xs"
              disabled={asking}
              onClick={() => void ask(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
        <form
          className="rounded-xl border p-2 focus-within:ring-2 focus-within:ring-ring"
          onSubmit={(event) => {
            event.preventDefault()
            ask(input)
          }}
        >
          <Textarea
            ref={inputRef}
            aria-label="Ask copilot"
            placeholder="Ask about this inbox..."
            className="min-h-20 resize-none border-0 focus-visible:ring-0"
            maxLength={2000}
            value={input}
          onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); ask(input) } }}
            onChange={(event) => setInput(event.target.value)}
          />
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">
              Inbox tools · no email sending
            </span>
            <Button
              type="submit"
              aria-label="Send to copilot"
              size="icon-sm"
              disabled={asking || !input.trim()}
            >
              <ArrowUp />
            </Button>
          </div>
        </form>
      </div>
    </>
  )
  return mobile ? (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose()
      }}
    >
      <SheetContent
          id="copilot-panel"
        showCloseButton={false}
        className="!w-full !max-w-full gap-0 bg-[#f5f7ff] dark:bg-[#1c2133]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Inbox assistant</SheetTitle>
          <SheetDescription>
            Contextual inbox tools and conversation
          </SheetDescription>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  ) : (
    <aside
      id="copilot-panel"
      aria-label="Copilot panel"
      className="fixed inset-y-0 right-0 z-40 flex flex-col border-l bg-[#f5f7ff] shadow-sm dark:bg-[#1c2133]"
      style={{ width }}
    >
      {content}
    </aside>
  )
}
