import type { Client, Email } from "./store"

export function voiceInbox(clients: Client[], emails: Email[]) {
  const describe = (items: Email[]) => ({
    count: items.length,
    examples: items.slice(0, 3).map(({ subject, category }) => ({
      subject: subject.slice(0, 160),
      category: category.slice(0, 80),
    })),
  })
  return clients.map((client) => {
    const inbox = emails.filter((item) => item.clientId === client.id)
    const pending = inbox.filter((item) => !item.approved)
    const replies = pending.filter((item) => item.owner === "PA" && !item.hasReply)
    const approvals = pending.filter((item) => item.owner === "CLIENT")
    return {
      client: client.name,
      pending: pending.filter((item) => item.owner !== "FYI").length,
      readWithoutReply: pending.filter((item) => item.owner !== "FYI" && item.readNoReply).length,
      approved: inbox.length - pending.length,
      urgentReplies: describe(replies.filter((item) => item.priority === "High")),
      urgentApprovals: describe(approvals.filter((item) => item.priority === "High")),
      pendingReplies: replies.length,
      pendingApprovals: approvals.length,
    }
  }).sort((a, b) =>
    b.urgentReplies.count - a.urgentReplies.count ||
    b.urgentApprovals.count - a.urgentApprovals.count ||
    b.pending - a.pending
  )
}
