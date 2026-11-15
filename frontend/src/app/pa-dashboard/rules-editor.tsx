import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useInbox, type Client } from "./store"

export function RulesEditor({ client }: { client: Client }) {
  const [rules, setRules] = useState(client.rules)
  const [notice, setNotice] = useState("")
  const { saveRules, busy } = useInbox()
  async function save() {
    setNotice("")
    try {
      await saveRules(client.id, rules)
      setNotice("Rules saved. New emails will use these rules.")
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not save the rules."
      )
    }
  }
  return (
    <details className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium">
        Delegation rules for {client.name.split(" ")[0]}
      </summary>
      <div className="space-y-3 pt-4">
        <label htmlFor="delegation-rules" className="sr-only">
          Delegation rules
        </label>
        <Textarea
          id="delegation-rules"
          maxLength={6000}
          value={rules}
          onChange={(event) => {
            setRules(event.target.value)
            setNotice("")
          }}
          disabled={!!busy}
          className="min-h-28"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            onClick={save}
            disabled={!!busy || !rules.trim() || rules === client.rules}
          >
            {busy === "rules" ? "Saving..." : "Save rules"}
          </Button>
          <p role="status" className="text-xs text-muted-foreground">
            {notice}
          </p>
        </div>
      </div>
    </details>
  )
}
