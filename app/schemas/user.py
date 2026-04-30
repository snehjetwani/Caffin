from pydantic import BaseModel
from uuid import UUID

class UserCreate(BaseModel):
    first_name: str
    last_name: str

class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None

class UserResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str

    class Config:
        from_attributes = True