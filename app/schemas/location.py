from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class LocationCreate(BaseModel):
    google_place_id: str
    name: str
    type: str

class LocationResponse(BaseModel):
    id: UUID
    google_place_id: str
    name: str
    type: str
    outlet_availability: str
    address: Optional[str] = None
    photo_url: Optional[str] = None
    website: Optional[str] = None
    opening_hours: Optional[str] = None
    rating: Optional[float] = None

    class Config:
        from_attributes = True