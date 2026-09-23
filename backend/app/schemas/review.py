from pydantic import BaseModel, Field, field_validator
from uuid import UUID
from typing import Optional, List
from datetime import datetime

MAX_PHOTOS = 3

class ReviewCreate(BaseModel):
    session_id: Optional[UUID] = None
    location_id: UUID
    stars: int = Field(..., ge=1, le=5)
    opinion: Optional[str] = None
    outlet_availability: Optional[str] = None
    # URLs of photos already uploaded to Supabase Storage by the client.
    photo_urls: Optional[List[str]] = None

    @field_validator("photo_urls")
    @classmethod
    def _limit_photos(cls, v):
        if v is not None and len(v) > MAX_PHOTOS:
            raise ValueError(f"At most {MAX_PHOTOS} photos allowed")
        return v

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
    photos: List[str] = []

    class Config:
        from_attributes = True
