import { ArrowUpRight, Check, Eye, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useInbox, type Email } from "./store"

export function ReadingPane({
  email,
  vip,
  onNotice,
}: {
  email: Email
  vip: boolean
  onNotice: (message: string) => void
}) {
  const { updateDraft, escalate, approve } = useInbox()
  return (
    <article
      id="selected-email"
      aria-label="Selected email"
      className="min-w-0 scroll-mt-4 rounded-xl border bg-card"
    >
      <div className="space-y-4 border-b p-5 md:p-6">
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={email.priority === "High" ? "destructive" : "secondary"}
          >
            {email.priority} priority
          </Badge>
          <Badge variant="outline">{email.category}</Badge>
          <Badge variant="outline">
            {email.owner === "CLIENT"
              ? "Client action"
              : email.owner === "PA"
                ? "PA action"
                : "FYI"}
          </Badge>
          {email.approved && (
            <Badge variant="secondary">
              <Check /> Draft approved
            </Badge>
          )}
        </div>
        <h2 className="text-xl font-semibold tracking-tight">
          {email.subject}
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
            {email.sender
              .split(" ")
              .map((word) => word[0])
              .join("")}
          </div>
          <div>
            <p className="font-medium">{email.sender}</p>
            <p className="text-xs text-muted-foreground">
              To your client's inbox
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-6 p-5 md:p-6">
        {email.readNoReply && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            <Eye className="mt-0.5 size-4 shrink-0" />
            <p>
              Read by client, no reply yet. Confirm ownership before responding.
            </p>
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm leading-7">{email.body}</p>
        <section className="rounded-lg bg-muted/50 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4" /> Triage reasoning{" "}
            <span className="text-xs font-normal text-muted-foreground">
              · demo
            </span>
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            {email.reasoning}
          </p>
        </section>
        {email.owner !== "FYI" && (
          <section className="space-y-3">
            <label htmlFor="reply-draft" className="text-sm font-medium">
              Suggested reply
            </label>
            <Textarea
              id="reply-draft"
              className="min-h-36 leading-6"
              value={email.draft}
              disabled={email.approved}
              onChange={(event) => updateDraft(email.id, event.target.value)}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Edits stay in this demo session. Email delivery is not connected.
            </p>
            {!email.approved && (
              <div className="flex flex-wrap gap-2">
                {email.owner === "PA" && !vip && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      escalate(email.id)
                      onNotice("Email moved to the client's approval queue.")
                    }}
                  >
                    <ArrowUpRight /> Escalate to client
                  </Button>
                )}
                {email.owner === "CLIENT" && vip && (
                  <Button
                    disabled={!email.draft.trim()}
                    onClick={() => {
                      approve(email.id)
                      onNotice("Draft approved in demo. No email was sent.")
                    }}
                  >
                    <Check /> Approve draft
                  </Button>
                )}
                {email.owner === "CLIENT" && !vip && (
                  <p className="text-sm text-muted-foreground">
                    Awaiting client review in VIP view.
                  </p>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </article>
  )
}
