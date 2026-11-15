import { create } from "zustand"
import {
  api,
  type Client,
  type Email,
  type Owner,
  type Simulation,
} from "./api"
export type { Client, Email, Owner } from "./api"
export type Queue = "ALL" | Owner | "READ" | "APPROVED"
export function matchesQueue(item: Email, queue: Queue): boolean {
  if (queue === "APPROVED") return item.approved
  if (item.approved) return false
  return (
    queue === "ALL" ||
    (queue === "READ" ? item.readNoReply : item.owner === queue)
  )
}
interface InboxState {
  clients: Client[]
  emails: Email[]
  loading: boolean
  initialized: boolean
  busy: string
  error: string
  initialize: () => Promise<void>
  updateDraft: (id: string, draft: string) => void
  saveDraft: (id: string) => Promise<void>
  escalate: (id: string) => Promise<void>
  approve: (id: string) => Promise<void>
  simulate: (data: Simulation) => Promise<string>
  saveRules: (id: string, rules: string) => Promise<void>
}
export const useInbox = create<InboxState>((set, get) => {
  const replaceEmail = (row: Email) =>
    set((state) => ({
      emails: state.emails.map((email) => (email.id === row.id ? row : email)),
    }))
  async function operation<T>(id: string, work: () => Promise<T>): Promise<T> {
    if (get().busy)
      throw new Error("Please wait for the current action to finish.")
    set({ busy: id, error: "" })
    try {
      return await work()
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please retry.",
      })
      throw error
    } finally {
      set({ busy: "" })
    }
  }
  async function persistDraft(id: string) {
    const email = get().emails.find((item) => item.id === id)
    if (email && email.draft !== email.savedDraft)
      replaceEmail(await api.save(id, email.draft))
  }
  return {
    clients: [],
    emails: [],
    loading: false,
    initialized: false,
    busy: "",
    error: "",
    initialize: async () => {
      if (get().loading) return
      set({ loading: true, error: "" })
      try {
        await api.login()
        const [clients, emails] = await Promise.all([
          api.clients(),
          api.emails(),
        ])
        const previous = get().emails
        set({
          clients,
          initialized: true,
          emails: emails.map((email) => {
            const local = previous.find((item) => item.id === email.id)
            return local && !email.approved && local.draft !== local.savedDraft
              ? { ...email, draft: local.draft }
              : email
          }),
        })
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Could not load the inbox.",
        })
      } finally {
        set({ loading: false })
      }
    },
    updateDraft: (id, draft) =>
      set((state) => ({
        emails: state.emails.map((email) =>
          email.id === id ? { ...email, draft } : email
        ),
      })),
    saveDraft: (id) => operation(id, () => persistDraft(id)),
    escalate: (id) =>
      operation(id, async () => {
        await persistDraft(id)
        replaceEmail(await api.escalate(id))
      }),
    approve: (id) =>
      operation(id, async () => {
        await persistDraft(id)
        replaceEmail(await api.approve(id))
      }),
    simulate: (data) =>
      operation("simulate", async () => {
        const email = await api.simulate(data)
        set((state) => ({ emails: [email, ...state.emails] }))
        return email.id
      }),
    saveRules: (id, rules) =>
      operation("rules", async () => {
        const client = await api.rules(id, rules)
        set((state) => ({
          clients: state.clients.map((item) =>
            item.id === id ? { ...item, ...client } : item
          ),
        }))
      }),
  }
})
