from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class FriendResponse(BaseModel):
    user_id: UUID
    first_name: str
    last_name: str
    email: str
    date_established: datetime

    class Config:
        from_attributes = True

class FeedItem(BaseModel):
    session_id: UUID
    user_id: UUID
    first_name: str
    last_name: str
    location_id: UUID | None = None
    location_name: str | None = None
    start_time: datetime
    end_time: datetime | None = None
    duration_minutes: int | None = None
    stars: int | None = None
    opinion: str | None = None

    class Config:
        from_attributes = True