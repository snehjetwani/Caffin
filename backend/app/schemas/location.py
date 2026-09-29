from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List

class LocationCreate(BaseModel):
    google_place_id: str
    name: str
    type: str

class LocationSeedItem(BaseModel):
    google_place_id: str
    name: str
    type: str = "other"

class LocationSeedRequest(BaseModel):
    places: List[LocationSeedItem]

class LocationSeedResponse(BaseModel):
    created: int
    skipped: int

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