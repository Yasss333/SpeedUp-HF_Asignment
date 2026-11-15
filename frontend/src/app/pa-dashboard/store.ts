import { create } from "zustand"

export type Owner = "PA" | "CLIENT" | "FYI"
export type Queue = "ALL" | Owner | "READ" | "APPROVED"
export interface Email {
  id: string
  clientId: string
  sender: string
  subject: string
  body: string
  reasoning: string
  draft: string
  owner: Owner
  priority: "High" | "Normal" | "Low"
  category: string
  readNoReply: boolean
  approved: boolean
}
export const clients = [
  {
    id: "vikram",
    name: "Vikram Mehta",
    role: "Founder · Northstar",
    rules:
      "Handle scheduling, invoices, and routine follow-ups. Escalate investor commitments and legal decisions to Vikram.",
  },
  {
    id: "ananya",
    name: "Ananya Rao",
    role: "CEO · Studio Forma",
    rules:
      "Handle logistics and supplier invoices. Ananya approves partnerships, pricing decisions, and contracts.",
  },
]
function email(
  id: string,
  clientId: string,
  sender: string,
  subject: string,
  owner: Owner,
  category: string,
  body: string,
  draft: string,
  readNoReply = false
): Email {
  return {
    id,
    clientId,
    sender,
    subject,
    body,
    draft,
    owner,
    category,
    readNoReply,
    approved: false,
    priority:
      readNoReply || owner === "CLIENT"
        ? "High"
        : owner === "FYI"
          ? "Low"
          : "Normal",
    reasoning:
      owner === "CLIENT"
        ? "This request needs a personal decision or commitment under the client's delegation rules."
        : owner === "PA"
          ? "This is within the assistant's delegated scope. Prepare the response and escalate if a personal commitment is needed."
          : "This update has no requested action. Keep it available for reference.",
  }
}
const seed: Email[] = [
  email(
    "v1",
    "vikram",
    "Sarah Chen",
    "Investor follow-up",
    "PA",
    "Follow-up",
    "Hi Vikram, could your team coordinate a 30-minute investor update this week? Please share a few available times.",
    "Hi Sarah, happy to coordinate the investor update. I'll check Vikram's availability and share a few options shortly.",
    true
  ),
  email(
    "v2",
    "vikram",
    "Daniel Park",
    "Term sheet needs your review",
    "CLIENT",
    "Investment",
    "We have shared the updated investment terms. Can you confirm your position on the valuation and board seat before we proceed?",
    "Hi Daniel, thank you for the updated terms. I am reviewing the valuation and governance provisions and will follow up with my comments.",
    true
  ),
  email(
    "v3",
    "vikram",
    "Priya Shah",
    "Schedule the product review",
    "PA",
    "Scheduling",
    "Could we find a time for next week's product review? The team is available Tuesday or Wednesday afternoon.",
    "Hi Priya, I'll coordinate with Vikram and confirm a time for the product review."
  ),
  email(
    "v4",
    "vikram",
    "Alex Morgan",
    "October invoice for processing",
    "PA",
    "Finance",
    "Sharing the October services invoice for the standard monthly retainer. Please pass this to finance for processing.",
    "Hi Alex, received with thanks. I'll forward the invoice to finance for processing."
  ),
  email(
    "v5",
    "vikram",
    "Maya Patel",
    "Weekly engineering update",
    "FYI",
    "Update",
    "This week's release is complete. All planned milestones are on track. No decisions or follow-ups are needed.",
    ""
  ),
  email(
    "v6",
    "vikram",
    "Rohan Gupta",
    "Contract sign-off requested",
    "CLIENT",
    "Legal",
    "The revised supplier agreement is ready. We need your approval of the liability clause before it can be signed.",
    "Hi Rohan, I will review the revised liability clause before confirming approval."
  ),
  email(
    "a1",
    "ananya",
    "Emma Wilson",
    "Design partnership proposal",
    "CLIENT",
    "Partnership",
    "We would love to partner with Studio Forma on our upcoming launch. Could you review the proposed commercial terms?",
    "Hi Emma, thank you for the proposal. I will review the commercial terms and get back to you.",
    true
  ),
  email(
    "a2",
    "ananya",
    "Arjun Nair",
    "Confirm the studio visit",
    "PA",
    "Scheduling",
    "Can you confirm the visitor list and a suitable time for our studio visit on Friday?",
    "Hi Arjun, I'll coordinate the studio visit and send the confirmed time and visitor details."
  ),
  email(
    "a3",
    "ananya",
    "Olivia Brown",
    "Supplier invoice received",
    "PA",
    "Finance",
    "Please arrange processing of the approved print supplier invoice with your finance team.",
    "Hi Olivia, I'll send the invoice to finance for processing."
  ),
  email(
    "a4",
    "ananya",
    "Leo Martin",
    "Launch progress report",
    "FYI",
    "Update",
    "The launch assets are ready for delivery. No approval is required at this stage.",
    ""
  ),
]
interface InboxState {
  emails: Email[]
  updateDraft: (id: string, draft: string) => void
  escalate: (id: string) => void
  approve: (id: string) => void
  simulate: (clientId: string) => string
}
export function matchesQueue(item: Email, queue: Queue): boolean {
  if (queue === "APPROVED") return item.approved
  if (item.approved) return false
  if (queue === "ALL") return true
  if (queue === "READ") return item.readNoReply
  return item.owner === queue
}
export const useInbox = create<InboxState>((set) => ({
  emails: seed,
  updateDraft: (id, draft) =>
    set((state) => ({
      emails: state.emails.map((item) =>
        item.id === id ? { ...item, draft } : item
      ),
    })),
  escalate: (id) =>
    set((state) => ({
      emails: state.emails.map((item) =>
        item.id === id ? { ...item, owner: "CLIENT" } : item
      ),
    })),
  approve: (id) =>
    set((state) => ({
      emails: state.emails.map((item) =>
        item.id === id ? { ...item, approved: true } : item
      ),
    })),
  simulate: (clientId) => {
    const id = crypto.randomUUID()
    set((state) => ({
      emails: [
        email(
          id,
          clientId,
          "Demo Sender",
          "New meeting request",
          "PA",
          "Scheduling",
          "Could you coordinate a meeting next week? Please send a few available times.",
          "Hi, happy to coordinate. I'll check availability and get back to you with a few options."
        ),
        ...state.emails,
      ],
    }))
    return id
  },
}))
