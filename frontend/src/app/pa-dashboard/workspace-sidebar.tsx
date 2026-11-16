import { queues } from "./queues"
import { PA_NAME } from "./pa"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { matchesQueue, useInbox, type Queue } from "./store"
export function WorkspaceSidebar({
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
  const clients = useInbox((state) => state.clients)
  const emails = useInbox((state) => state.emails).filter(
    (email) => email.clientId === clientId
  )
  const { setOpenMobile } = useSidebar()
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-6 p-5">
        <div>
          <img src="/speedup-logo.png" alt="Speedup" className="w-40 dark:invert" />
          <p className="text-xs text-muted-foreground">
            Your executive inbox, in sync
          </p>
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
            Sample inboxes saved for this demo session. Real email delivery is
            not connected.
          </p>
        </div>
        <div className="flex items-center gap-3 border-t pt-4">
          <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
            PA
          </div>
          <div>
            <p className="text-sm font-medium">{PA_NAME}</p>
            <p className="text-xs text-muted-foreground">
              Multi-client workspace
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
