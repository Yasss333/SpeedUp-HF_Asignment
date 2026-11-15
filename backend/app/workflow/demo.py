from datetime import UTC, datetime
from uuid import uuid4

DEFAULT_RULES = (
    "PA handles scheduling, invoices, travel, and routine follow-ups. "
    "CLIENT handles legal commitments, investor decisions, and personal approvals. "
    "Newsletters and receipts without an action are FYI. "
    "Read status alone never means an email was handled."
)

# Each row explicitly specifies routing. Demo data is never presented as AI output.
EXAMPLES = [
    (
        "Team meeting schedule",
        "Please arrange a 30 minute team meeting on Friday.",
        "PA",
        "MEDIUM",
        "Scheduling",
        False,
    ),
    (
        "Vendor invoice approval",
        "Please process the attached routine vendor invoice.",
        "PA",
        "MEDIUM",
        "Finance",
        True,
    ),
    (
        "Investor term sheet decision",
        "Please confirm your decision on our term sheet.",
        "CLIENT",
        "HIGH",
        "Investor",
        True,
    ),
    (
        "Legal agreement signature",
        "We need your personal approval of the legal terms.",
        "CLIENT",
        "HIGH",
        "Legal",
        False,
    ),
    (
        "Weekly industry newsletter",
        "This week in technology. No response required.",
        "FYI",
        "LOW",
        "Newsletter",
        True,
    ),
    (
        "Travel itinerary confirmation",
        "Please confirm the hotel booking for next week.",
        "PA",
        "MEDIUM",
        "Travel",
        True,
    ),
]


async def seed_demo(store, user_id, expires_at):
    now = datetime.now(UTC)
    for name, email in [
        ("Vikram Shah", "vikram@example.com"),
        ("Ananya Rao", "ananya@example.com"),
    ]:
        client_id = str(uuid4())
        await store.insert(
            "clients",
            {
                "_id": client_id,
                "tenant_id": user_id,
                "name": name,
                "email": email,
                "rules": DEFAULT_RULES,
                "expires_at": expires_at,
            },
        )
        for subject, body, owner, priority, category, is_read in EXAMPLES:
            await store.insert(
                "emails",
                {
                    "_id": str(uuid4()),
                    "tenant_id": user_id,
                    "client_id": client_id,
                    "sender": "demo@example.com",
                    "subject": subject,
                    "body": body,
                    "owner": owner,
                    "priority": priority,
                    "category": category,
                    "summary": body,
                    "reasoning": f"Demo routing: {category} belongs to {owner}.",
                    "suggested_draft": ""
                    if owner == "FYI"
                    else "Thank you for your email. I will review this and follow up shortly.",
                    "is_read": is_read,
                    "has_reply": False,
                    "read_no_reply": is_read,
                    "status": "PENDING",
                    "triage_source": "DEMO",
                    "created_at": now,
                    "updated_at": now,
                    "approved_at": None,
                    "sent_at": None,
                    "version": 1,
                    "expires_at": expires_at,
                    "priority_rank": {"HIGH": 0, "MEDIUM": 1, "LOW": 2}[priority],
                },
            )
