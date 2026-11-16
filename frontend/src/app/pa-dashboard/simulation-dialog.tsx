import { useState } from "react"
import { LoaderCircle, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useInbox } from "./store"

export const simulationTemplates = [
  {
    label: "Investor decision",
    sender: "investor@example.com",
    subject: "Investor term sheet decision",
    body: "Please confirm your personal decision on the proposed valuation and board seat. We need your approval before proceeding.",
  },
  {
    label: "Schedule a meeting",
    sender: "team@example.com",
    subject: "Arrange a team meeting",
    body: "Please coordinate a 30-minute team meeting next week and share the available times.",
  },
  {
    label: "Read, no reply",
    sender: "legal@example.com",
    subject: "Contract approval follow-up",
    body: "Following up on the contract you reviewed. Can you personally approve the liability terms before we proceed?",
  },
  {
    label: "FYI newsletter",
    sender: "newsletter@example.com",
    subject: "Weekly industry roundup",
    body: "Here is this week's industry roundup for your information. No action or reply is needed.",
  },
]
export function SimulationDialog({
  clientId,
  onCreated,
}: {
  clientId: string
  onCreated: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [sender, setSender] = useState(simulationTemplates[0].sender)
  const [subject, setSubject] = useState(simulationTemplates[0].subject)
  const [body, setBody] = useState(simulationTemplates[0].body)
  const [read, setRead] = useState(false)
  const [error, setError] = useState("")
  const { simulate, busy } = useInbox()
  const pending = busy === "simulate"
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    try {
      const id = await simulate({
        client_id: clientId,
        sender: sender.trim(),
        subject: subject.trim(),
        body: body.trim(),
        is_read: read,
        has_reply: false,
      })
      onCreated(id)
      setOpen(false)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Simulation failed. Please retry."
      )
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value)
          setError("")
        }
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus /> Simulate incoming email
      </DialogTrigger>
      <DialogContent
        className="max-h-[90svh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!pending}
      >
        <DialogHeader>
          <DialogTitle>Simulate incoming email</DialogTitle>
          <DialogDescription>
            Try AI triage against this client's delegation rules. The result is
            saved to this demo inbox.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {simulationTemplates.map((template) => (
              <Button
                key={template.label}
                type="button"
                variant="outline"
                size="xs"
                disabled={pending}
                onClick={() => {
                  setSender(template.sender)
                  setSubject(template.subject)
                  setBody(template.body)
                  setRead(template.label === "Read, no reply")
                }}
              >
                {template.label}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <label htmlFor="sim-sender" className="text-sm font-medium">
              Sender
            </label>
            <Input
              id="sim-sender"
              required
              maxLength={320}
              disabled={pending}
              value={sender}
              onChange={(event) => setSender(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="sim-subject" className="text-sm font-medium">
              Subject
            </label>
            <Input
              id="sim-subject"
              required
              maxLength={300}
              disabled={pending}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="sim-body" className="text-sm font-medium">
              Email body
            </label>
            <Textarea
              id="sim-body"
              required
              maxLength={20000}
              className="min-h-36"
              disabled={pending}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={read}
              disabled={pending}
              onChange={(event) => setRead(event.target.checked)}
            />
            Read by client, no reply yet
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !!busy || !sender.trim() || !subject.trim() || !body.trim()
              }
            >
              {pending && <LoaderCircle className="animate-spin" />}
              {pending ? "Triaging email..." : "Run AI triage"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
