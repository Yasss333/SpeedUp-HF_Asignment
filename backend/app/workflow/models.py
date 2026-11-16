from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Owner = Literal["PA", "CLIENT", "FYI"]
Priority = Literal["HIGH", "MEDIUM", "LOW"]
Status = Literal["PENDING", "APPROVED"]
Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Triage(InputModel):
    owner: Owner
    priority: Priority
    category: str = Field(min_length=1, max_length=80)
    summary: str = Field(min_length=1, max_length=2000)
    reasoning: str = Field(min_length=1, max_length=2000)
    suggested_draft: str = Field(max_length=10000)


class Client(BaseModel):
    id: str
    name: str
    email: str
    rules: str


class Email(Triage):
    id: str
    client_id: str
    sender: str
    subject: str
    body: str
    is_read: bool
    has_reply: bool
    read_no_reply: bool
    status: Status = "PENDING"
    triage_source: Literal["DEMO", "AI"]
    created_at: datetime
    updated_at: datetime
    approved_at: datetime | None = None
    sent_at: datetime | None = None
    version: int = 1


class EmailPage(BaseModel):
    items: list[Email]
    total: int
    page: int
    page_size: int


class Session(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user_id: str
    mode: Literal["DEMO"] = "DEMO"


class SimulateInput(InputModel):
    client_id: Text = Field(max_length=100)
    sender: Text = Field(max_length=320)
    subject: Text = Field(max_length=300)
    body: Text = Field(max_length=20000)
    is_read: bool = False
    has_reply: bool = False


class DraftInput(InputModel):
    draft: Text = Field(max_length=10000)


class RulesInput(InputModel):
    rules: Text = Field(max_length=6000)


class CopilotMessage(InputModel):
    role: Literal["user", "assistant"]
    text: Text = Field(max_length=4000)


class CopilotInput(InputModel):
    question: Text = Field(max_length=2000)
    selected_email_id: str | None = Field(default=None, max_length=100)
    history: list[CopilotMessage] = Field(default_factory=list, max_length=8)


class CopilotAnswer(InputModel):
    answer: Text = Field(max_length=4000)
    email_ids: list[str] = Field(max_length=8)
