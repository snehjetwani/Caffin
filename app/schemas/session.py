from pydantic import BaseModel
from uuid import UUID
from typing import Optional
from datetime import datetime

class SessionCreate(BaseModel):
    location_id: Optional[UUID] = None

class SessionEnd(BaseModel):
    end_time: datetime

class SessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    location_id: Optional[UUID] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None

    class Config:
        from_attributes = True