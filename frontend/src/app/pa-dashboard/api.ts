import { z } from "zod"

const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  rules: z.string(),
})
const emailSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  sender: z.string(),
  subject: z.string(),
  body: z.string(),
  summary: z.string(),
  reasoning: z.string(),
  suggested_draft: z.string(),
  owner: z.enum(["PA", "CLIENT", "FYI"]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  category: z.string(),
  read_no_reply: z.boolean(),
  has_reply: z.boolean(),
  status: z.enum(["PENDING", "APPROVED"]),
  triage_source: z.enum(["DEMO", "AI"]),
})
export interface Client {
  id: string
  name: string
  email: string
  rules: string
  role: string
}
export type Owner = "PA" | "CLIENT" | "FYI"
export interface Email {
  id: string
  clientId: string
  sender: string
  subject: string
  body: string
  summary: string
  reasoning: string
  draft: string
  savedDraft: string
  owner: Owner
  priority: "High" | "Normal" | "Low"
  category: string
  readNoReply: boolean
  hasReply: boolean
  approved: boolean
  source: "DEMO" | "AI"
}
export interface Simulation {
  client_id: string
  sender: string
  subject: string
  body: string
  is_read: boolean
  has_reply: boolean
}
let token = sessionStorage.getItem("speedup-session") || ""

async function request(
  path: string,
  method = "GET",
  body?: object
): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "/api"}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(40000),
    })
  } catch {
    throw new Error(
      "Cannot reach the service. Check your connection and try again."
    )
  }
  if (!response.ok) {
    if (response.status === 401) {
      token = ""
      sessionStorage.removeItem("speedup-session")
      throw new Error(
        "Your demo session expired. Reload to start a new session."
      )
    }
    const messages: Record<number, string> = {
      403: "Demo access is disabled.",
      404: "This item is no longer available. Refresh the inbox.",
      409: "This email changed. Refresh the inbox before trying again.",
      422: "Check the form fields and try again.",
      429: "Too many requests. Please wait a minute before trying again.",
      502: "AI triage could not finish. Please retry.",
      503: "The service is unavailable. Check the backend and database.",
      504: "AI triage timed out. Please retry.",
    }
    throw new Error(
      messages[response.status] || "The request failed. Please try again."
    )
  }
  return response.json()
}
function mapEmail(input: unknown): Email {
  const row = emailSchema.parse(input)
  return {
    id: row.id,
    clientId: row.client_id,
    sender: row.sender,
    subject: row.subject,
    body: row.body,
    summary: row.summary,
    reasoning: row.reasoning,
    draft: row.suggested_draft,
    savedDraft: row.suggested_draft,
    owner: row.owner,
    priority:
      row.priority === "HIGH"
        ? "High"
        : row.priority === "LOW"
          ? "Low"
          : "Normal",
    category: row.category,
    readNoReply: row.read_no_reply,
    hasReply: row.has_reply,
    approved: row.status === "APPROVED",
    source: row.triage_source,
  }
}
export const api = {
  async login() {
    if (token) return
    const result = z
      .object({ access_token: z.string() })
      .parse(await request("/auth/demo-login", "POST"))
    token = result.access_token
    sessionStorage.setItem("speedup-session", token)
  },
  async clients(): Promise<Client[]> {
    return z
      .array(clientSchema)
      .parse(await request("/clients"))
      .map((row) => ({ ...row, role: row.email }))
  },
  async emails(): Promise<Email[]> {
    const all: Email[] = []
    for (let page = 1; ; page++) {
      const result = z
        .object({ items: z.array(emailSchema), total: z.number() })
        .parse(await request(`/emails?page=${page}&page_size=100`))
      all.push(...result.items.map(mapEmail))
      if (all.length >= result.total || !result.items.length) return all
    }
  },
  async save(id: string, draft: string) {
    return mapEmail(
      await request(`/emails/${encodeURIComponent(id)}/draft`, "PATCH", {
        draft,
      })
    )
  },
  async escalate(id: string) {
    return mapEmail(
      await request(`/emails/${encodeURIComponent(id)}/escalate`, "POST")
    )
  },
  async approve(id: string) {
    return mapEmail(
      await request(`/emails/${encodeURIComponent(id)}/approve`, "POST")
    )
  },
  async simulate(data: Simulation) {
    return mapEmail(await request("/emails/simulate", "POST", data))
  },
  async rules(id: string, rules: string) {
    return clientSchema.parse(
      await request(`/clients/${encodeURIComponent(id)}/rules`, "PATCH", {
        rules,
      })
    )
  },
}
