import { Eye, Inbox } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Email } from "./store"

export function InboxList({
  emails,
  selectedId,
  onSelect,
}: {
  emails: Email[]
  selectedId?: string
  onSelect: (id: string) => void
}) {
  if (!emails.length)
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <Inbox className="mx-auto mb-3 size-7 text-muted-foreground" />
        <h2 className="font-medium">No emails in this queue</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Try another queue or a different search.
        </p>
      </div>
    )
  return (
    <section
      aria-label="Email queue"
      className="min-w-0 overflow-hidden rounded-xl border bg-card"
    >
      <div className="border-b px-4 py-3 text-xs font-medium text-muted-foreground">
        {emails.length} {emails.length === 1 ? "conversation" : "conversations"}
      </div>
      <div className="max-h-[38rem] overflow-y-auto divide-y">
        {emails.map((email) => (
          <button
            key={email.id}
            aria-label={`Open email: ${email.subject}`}
            aria-pressed={email.id === selectedId}
            onClick={() => onSelect(email.id)}
            className={cn(
              "w-full min-w-0 border-l-2 border-l-transparent p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2",
              email.id === selectedId && "border-l-primary bg-muted/70"
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">
                {email.sender}
              </span>
              <Badge
                variant={
                  email.priority === "High" ? "destructive" : "secondary"
                }
              >
                {email.priority}
              </Badge>
            </div>
            <h3 className="mb-1 truncate text-sm font-semibold">
              {email.subject}
            </h3>
            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
              {email.body}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {email.approved
                  ? "Draft approved"
                  : email.owner === "CLIENT"
                    ? "Client action"
                    : email.owner === "PA"
                      ? "PA action"
                      : "FYI"}
              </span>
              {email.readNoReply && (
                <span className="flex items-center gap-1">
                  <Eye className="size-3" /> Read, no reply
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
