import { useState } from "react"
import {
  CheckCheck,
  Eye,
  Inbox,
  Mail,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { clients, matchesQueue, useInbox, type Queue } from "./store"
import { ReadingPane } from "./reading-pane"
import { InboxList } from "./inbox-list"

const queues: { id: Queue; label: string; icon: typeof Inbox }[] = [
  { id: "ALL", label: "All emails", icon: Inbox },
  { id: "PA", label: "PA action", icon: Mail },
  { id: "CLIENT", label: "Client action", icon: ShieldCheck },
  { id: "READ", label: "Read, no reply", icon: Eye },
  { id: "FYI", label: "FYI", icon: Inbox },
  { id: "APPROVED", label: "Approved drafts", icon: CheckCheck },
]

function WorkspaceSidebar({
  clientId,
  onClient,
  queue,
  onQueue,
}: {
  clientId: string
  onClient: (id: string) => void
  queue: Queue
  onQueue: (queue: Queue) => void
}) {
  const emails = useInbox((state) => state.emails).filter(
    (email) => email.clientId === clientId
  )
  const { setOpenMobile } = useSidebar()
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-6 p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Mail className="size-5" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">SpeedUp</p>
            <p className="text-xs text-muted-foreground">
              Your executive inbox, in sync
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <label
            htmlFor="client-inbox"
            className="text-xs font-medium text-muted-foreground"
          >
            CLIENT WORKSPACE
          </label>
          <select
            id="client-inbox"
            aria-label="Client inbox"
            className="h-10 w-full rounded-lg border bg-background px-2 text-sm focus-visible:outline-ring"
            value={clientId}
            onChange={(event) => onClient(event.target.value)}
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {clients.find((client) => client.id === clientId)?.role}
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-3">
        <p className="px-3 pb-3 text-xs font-medium text-muted-foreground">
          INBOX
        </p>
        <nav aria-label="Inbox queues" className="space-y-1">
          {queues.map((item) => (
            <button
              key={item.id}
              aria-current={queue === item.id ? "page" : undefined}
              onClick={() => {
                onQueue(item.id)
                setOpenMobile(false)
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring",
                queue === item.id && "bg-sidebar-accent font-medium"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
              <span className="ml-auto text-xs text-muted-foreground">
                {emails.filter((email) => matchesQueue(email, item.id)).length}
              </span>
            </button>
          ))}
        </nav>
      </SidebarContent>
      <SidebarFooter className="gap-4 p-5">
        <div className="rounded-lg border p-3">
          <p className="mb-1 text-xs font-medium">Demo workspace</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Sample emails and routing. No inbox is connected. Changes reset on
            refresh.
          </p>
        </div>
        <div className="flex items-center gap-3 border-t pt-4">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
            PA
          </div>
          <div>
            <p className="text-sm font-medium">Personal assistant</p>
            <p className="text-xs text-muted-foreground">
              Multi-client workspace
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

export default function PADashboard() {
  const [clientId, setClientId] = useState("vikram")
  const [queue, setQueue] = useState<Queue>("ALL")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState("v1")
  const [vip, setVip] = useState(false)
  const [notice, setNotice] = useState("")
  const { emails, simulate } = useInbox()
  const client = clients.find((item) => item.id === clientId)!
  const clientEmails = emails.filter((email) => email.clientId === clientId)
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
  return (
    <SidebarProvider>
      <WorkspaceSidebar
        clientId={clientId}
        onClient={changeClient}
        queue={activeQueue}
        onQueue={(value) => {
          setQueue(value)
          setVip(false)
          setNotice("")
        }}
      />
      <SidebarInset className="min-w-0">
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
              <Button
                onClick={() => {
                  const id = simulate(clientId)
                  setQueue("ALL")
                  setQuery("")
                  setSelectedId(id)
                  setNotice(
                    "Sample email added with demo routing. No AI request was made."
                  )
                }}
              >
                <Plus /> Simulate demo email
              </Button>
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
            <details className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
              <summary className="cursor-pointer font-medium">
                Delegation rules for {client.name.split(" ")[0]}
              </summary>
              <p className="pt-3 leading-6 text-muted-foreground">
                {client.rules}
              </p>
            </details>
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
          SpeedUp · PA email workspace{" "}
          <span className="float-right">Demo session</span>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
