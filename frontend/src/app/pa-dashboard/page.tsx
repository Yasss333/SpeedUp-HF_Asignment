import { useEffect, useState } from "react"
import {
  CheckCheck,
  Eye,
  Mail,
  RefreshCw,
  Sparkles,
  Search,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ModeToggle } from "@/components/mode-toggle"
import { WorkspaceLoading } from "@/components/workspace-loading"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { matchesQueue, useInbox, type Queue } from "./store"
import { ReadingPane } from "./reading-pane"
import { InboxList } from "./inbox-list"
import { WorkspaceSidebar } from "./workspace-sidebar"
import { queues } from "./queues"
import { Copilot } from "./copilot"
import { SimulationDialog, simulationTemplates } from "./simulation-dialog"
import { RulesEditor } from "./rules-editor"

export default function PADashboard() {
  const [clientId, setClientId] = useState("vikram")
  const [queue, setQueue] = useState<Queue>("ALL")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState("v1")
  const [vip, setVip] = useState(false)
  const [notice, setNotice] = useState("")
  const [demoRunning, setDemoRunning] = useState(false)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const { emails, clients, initialize, loading, busy, error } = useInbox()
  useEffect(() => {
    void initialize()
  }, [initialize])
  const client = clients.find((item) => item.id === clientId) ?? clients[0]
  if (!client)
    return (
      <main className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-4 p-6">
        <div className="flex items-center justify-between">
          <h1>
            <img src="/speedup-logo.png" alt="Speedup" className="w-40 dark:invert" />
          </h1>
          <ModeToggle />
        </div>
        {error ? (
          <>
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button onClick={() => void initialize()}>Retry connection</Button>
          </>
        ) : (
          <WorkspaceLoading />
        )}
      </main>
    )
  const clientEmails = emails.filter((email) => email.clientId === client.id)
  const activeQueue = vip ? "CLIENT" : queue
  const filtered = clientEmails.filter(
    (email) =>
      matchesQueue(email, activeQueue) &&
      `${email.subject} ${email.sender} ${email.body}`
        .toLowerCase()
        .includes(query.toLowerCase())
  )
  const selected =
    filtered.find((email) => email.id === selectedId) ?? filtered[0]
  function changeClient(id: string) {
    setClientId(id)
    setQuery("")
    setQueue("ALL")
    setNotice("")
  }
  async function runDemoFeed(demoClientId: string) {
    setDemoRunning(true)
    setQueue("ALL")
    setQuery("")
    try {
      for (const template of simulationTemplates) {
        setNotice(`Demo email incoming: ${template.subject}…`)
        await new Promise((resolve) => window.setTimeout(resolve, 2500))
        const { simulate, busy } = useInbox.getState()
        if (busy) throw new Error("Another inbox action is running. Restart the demo feed when it finishes.")
        const id = await simulate({
          client_id: demoClientId,
          sender: template.sender,
          subject: template.subject,
          body: template.body,
          is_read: template.label === "Read, no reply",
          has_reply: false,
        })
        const email = useInbox.getState().emails.find((item) => item.id === id)
        const destination = queues.find((item) => item.id === email?.owner)?.label
        setNotice(`Demo email received: ${template.subject} → ${destination ?? "Inbox"}`)
        await new Promise((resolve) => window.setTimeout(resolve, 4500))
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Demo feed stopped. Try again.")
    } finally {
      setDemoRunning(false)
    }
  }
  return (
    <SidebarProvider>
      <WorkspaceSidebar
        clientId={client.id}
        onClient={changeClient}
        queue={activeQueue}
        onQueue={(value) => {
          setQueue(value)
          setVip(false)
          setNotice("")
        }}
      />
      <SidebarInset
        className={cn("min-w-0 transition-[margin]", copilotOpen && "lg:mr-96")}
      >
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger />
            <span className="truncate text-sm text-muted-foreground">
              {client.name}
              <span className="mx-2">/</span>
              <span className="text-foreground">
                {vip ? "VIP approvals" : "Inbox"}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <ModeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh inbox"
              disabled={loading || !!busy}
              onClick={() => void initialize()}
            >
              <RefreshCw className={cn(loading && "animate-spin")} />
            </Button>
            <Button
              id="copilot-toggle"
              className="border-indigo-400/70 bg-linear-to-r from-blue-700 via-indigo-700 to-violet-700 text-white shadow-[0_0_14px_#6366f150] hover:from-blue-800 hover:via-indigo-800 hover:to-violet-800 focus-visible:ring-cyan-400 aria-expanded:border-cyan-300"
              aria-expanded={copilotOpen}
              aria-controls="copilot-panel"
              onClick={() => setCopilotOpen(!copilotOpen)}
            >
              <Sparkles className="text-cyan-200" />
              Ask Copilot
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setVip(!vip)
                setQuery("")
                setNotice("")
              }}
            >
              <ShieldCheck />
              {vip ? "PA command view" : "Client VIP view"}
            </Button>
          </div>
        </header>
        <main className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary">Demo data</Badge>
                <span className="text-xs text-muted-foreground">
                  {client.role}
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {vip ? "Your approval queue" : "PA command center"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {vip
                  ? "Only the conversations that need your personal decision."
                  : "Know who owns the next step. Keep every important conversation moving."}
              </p>
            </div>
            {!vip && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={demoRunning || Boolean(busy)} onClick={() => void runDemoFeed(client.id)}>
                  {demoRunning ? "Demo feed running…" : "Start demo feed"}
                </Button>
                <SimulationDialog
                  clientId={client.id}
                  onCreated={(id) => {
                    setQueue("ALL")
                    setQuery("")
                    setSelectedId(id)
                    setNotice("Email triaged and saved to the inbox.")
                  }}
                />
              </div>
            )}
          </div>
          {!vip && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {(
                [
                  { id: "PA", label: "For you to handle", icon: Mail },
                  {
                    id: "CLIENT",
                    label: "Needs client decision",
                    icon: ShieldCheck,
                  },
                  { id: "READ", label: "Read without a reply", icon: Eye },
                  {
                    id: "APPROVED",
                    label: "Drafts approved",
                    icon: CheckCheck,
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setQueue(item.id)
                    setQuery("")
                  }}
                  className="rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <div className="mb-3 flex items-center justify-between gap-2 text-muted-foreground">
                    <span className="text-xs">{item.label}</span>
                    <item.icon className="size-4 shrink-0" />
                  </div>
                  <p className="text-2xl font-semibold">
                    {
                      clientEmails.filter((email) =>
                        matchesQueue(email, item.id)
                      ).length
                    }
                  </p>
                </button>
              ))}
            </div>
          )}
          {!vip && (
            <RulesEditor key={client.id} client={client} />
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">
              {vip
                ? "Needs your review"
                : queues.find((item) => item.id === queue)?.label}
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
              <Input
                aria-label="Search emails"
                placeholder="Search sender or conversation…"
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "text-sm text-muted-foreground",
              !notice && "sr-only"
            )}
          >
            {notice}
          </p>
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <InboxList
              emails={filtered}
              selectedId={selected?.id}
              onSelect={(id) => {
                setSelectedId(id)
                if (window.innerWidth < 1280)
                  document
                    .getElementById("selected-email")
                    ?.scrollIntoView({ behavior: "smooth" })
              }}
            />
            {selected && (
              <ReadingPane email={selected} vip={vip} onNotice={setNotice} />
            )}
          </div>
        </main>
        <footer className="border-t px-6 py-4 text-xs text-muted-foreground">
          Speedup · PA email workspace{" "}
          <span className="float-right">Demo session</span>
        </footer>
      </SidebarInset>
      <Copilot
        key={client.id}
        open={copilotOpen}
        onClose={() => {
          setCopilotOpen(false)
          document.getElementById("copilot-toggle")?.focus()
        }}
        client={client}
        vip={vip}
        email={selected}
        onSelect={(id) => {
          setQueue("ALL")
          setVip(false)
          setQuery("")
          setSelectedId(id)
        }}
      />
    </SidebarProvider>
  )
}
