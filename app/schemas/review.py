from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional
from datetime import datetime

class ReviewCreate(BaseModel):
    session_id: Optional[UUID] = None
    location_id: UUID
    stars: int = Field(..., ge=1, le=5)
    opinion: Optional[str] = None
    outlet_availability: Optional[str] = None

class ReviewResponse(BaseModel):
    id: UUID
    user_id: UUID
    session_id: Optional[UUID] = None
    location_id: UUID
    stars: int
    opinion: Optional[str] = None
    outlet_availability: Optional[str] = None
    source: str
    time_posted: datetime

    class Config:
        from_attributes = True