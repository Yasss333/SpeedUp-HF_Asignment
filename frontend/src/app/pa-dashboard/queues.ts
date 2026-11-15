import { CheckCheck, Eye, Inbox, Mail, ShieldCheck } from "lucide-react"
import type { Queue } from "./store"
export const queues: { id: Queue; label: string; icon: typeof Inbox }[] = [
  { id: "ALL", label: "All emails", icon: Inbox },
  { id: "PA", label: "PA action", icon: Mail },
  { id: "CLIENT", label: "Client action", icon: ShieldCheck },
  { id: "READ", label: "Read, no reply", icon: Eye },
  { id: "FYI", label: "FYI", icon: Inbox },
  { id: "APPROVED", label: "Approved drafts", icon: CheckCheck },
]

