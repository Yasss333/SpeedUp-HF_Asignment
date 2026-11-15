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
  email,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  client: Client
  email?: Email
  onSelect: (id: string) => void
}) {
  const mobile = useSyncExternalStore(subscribeToPanelWidth, () => window.matchMedia(panelQuery).matches, () => false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const { emails, escalate, busy } = useInbox()
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pending = emails.filter(
    (item) => item.clientId === client.id && !item.approved
  )
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
  function ask(prompt: string) {
    const text = prompt.trim()
    if (!text) return
    const query = text.toLowerCase()
    let reply: string
    let related: Email[] = []
    if (/draft|reply|response/.test(query) && email) {
      reply =
        email.draft ||
        "This thread is informational and has no suggested reply."
      related = [email]
    } else if (/read|unanswered|no reply/.test(query)) {
      related = pending.filter((item) => item.readNoReply)
      reply = `${related.length} read conversations still have no reply. Read status does not mean the client handled them.`
    } else if (/priority|urgent|important/.test(query)) {
      related = pending.filter((item) => item.priority === "High")
      reply = `${related.length} high-priority conversations need attention. Review the ownership and suggested reply before acting.`
    } else if (/rule|delegat/.test(query)) {
      reply = client.rules
    } else if (/this email|this thread|selected|explain/.test(query) && email) {
      reply = `${email.summary}\n\nOwnership: ${email.owner}. ${email.reasoning}`
      related = [email]
    } else if (/summari|overview|inbox|pending/.test(query)) {
      reply = `${client.name} has ${pending.length} pending conversations: ${pending.filter((item) => item.owner === "PA").length} for the PA, ${pending.filter((item) => item.owner === "CLIENT").length} for client review, and ${pending.filter((item) => item.owner === "FYI").length} FYI. ${pending.filter((item) => item.readNoReply).length} were read without a reply.`
      related = pending.filter((item) => item.priority === "High").slice(0, 3)
    } else {
      reply =
        "I can summarize this inbox, find high-priority or unanswered threads, show delegation rules, and bring up the selected email's suggested reply. Choose a shortcut below. Open-ended AI chat and voice are not connected yet."
    }
    setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: "user", text },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: reply,
        emailIds: related.map((item) => item.id),
      },
    ])
    setInput("")
  }
  async function escalateSelected() {
    if (!email) return
    try {
      await escalate(email.id)
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: `“${email.subject}” was moved to ${client.name}'s approval queue.`,
        },
      ])
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text:
            error instanceof Error
              ? error.message
              : "Escalation failed. Please retry.",
        },
      ])
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
          <h2 className="font-semibold">SpeedUp Copilot</h2>
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
              A little help with your inbox.
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
              onClick={() => ask(prompt)}
            >
              {prompt}
            </Button>
          ))}
        </div>
        {email?.owner === "PA" && !email.approved && (
          <Button
            variant="outline"
            size="sm"
            disabled={!!busy}
            onClick={escalateSelected}
          >
            <ArrowUpRight /> Escalate selected email
          </Button>
        )}
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
              disabled={!input.trim()}
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
        className="!w-full !max-w-full gap-0"
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
      className="fixed inset-y-0 right-0 z-40 flex w-96 flex-col border-l bg-background shadow-sm"
    >
      {content}
    </aside>
  )
}
