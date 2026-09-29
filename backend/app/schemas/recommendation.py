from pydantic import BaseModel
from uuid import UUID
from typing import List, Optional


class RecommendationItem(BaseModel):
    id: UUID
    google_place_id: str
    name: str
    type: str
    outlet_availability: str
    caffin_rating: Optional[float] = None   # avg stars across Caffin reviews
    review_count: int = 0
    similarity: float                        # 1 - cosine distance, higher = better
    # Merged live Google Places data
    address: Optional[str] = None
    photo_url: Optional[str] = None
    rating: Optional[float] = None           # Google rating

    class Config:
        from_attributes = True


class RecommendationResponse(BaseModel):
    unlocked: bool
    reviews_needed: int = 0                   # how many more reviews to unlock
    recommendations: List[RecommendationItem] = []


class ReindexResponse(BaseModel):
    locations_embedded: int
    user_embedded: bool
