from pydantic import BaseModel, field_validator
from uuid import UUID
import re

# Mirrors the users_username_format CHECK constraint in the DB.
USERNAME_RE = re.compile(r"^[a-z0-9_]{3,30}$")


def normalize_username(value: str) -> str:
    """Usernames are stored and queried lowercase"""
    cleaned = value.strip().lower()
    if not USERNAME_RE.match(cleaned):
        raise ValueError(
            "username must be 3-30 characters, letters, numbers and underscores only"
        )
    return cleaned


class UserCreate(BaseModel):
    first_name: str
    last_name: str
    username: str

    @field_validator("username")
    @classmethod
    def _normalize(cls, v: str) -> str:
        return normalize_username(v)


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    username: str

    class Config:
        from_attributes = True


class UserSearchResponse(BaseModel):
    """Profiles are private in the MVP"""
    id: UUID
    first_name: str
    last_name: str
    username: str
    is_self: bool
    is_friend: bool
    total_sessions: int | None = None
    favorite_spot: str | None = None

    class Config:
        from_attributes = True
