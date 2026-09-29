from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app.db.session import get_db
from app.auth import get_current_user
from app.schemas.location import (
    LocationCreate,
    LocationResponse,
    LocationSeedRequest,
    LocationSeedResponse,
)
from app.services.places import get_place_details, search_places

router = APIRouter(prefix="/locations", tags=["Locations"])

@router.get("/search")
async def search_locations(
    q: str = Query(..., description="Search query e.g. 'cafes near UBC'"),
    lat: float = Query(..., description="User latitude"),
    lng: float = Query(..., description="User longitude"),
    user=Depends(get_current_user)
):
    results = await search_places(q, lat, lng)
    return results

@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    body: LocationCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(
        text("SELECT id, google_place_id, name, type, outlet_availability FROM locations WHERE google_place_id = :gid"),
        {"gid": body.google_place_id}
    )
    row = existing.fetchone()
    if row:
        place = await get_place_details(body.google_place_id)
        return {**row._mapping, **place}

    try:
        result = await db.execute(
            text("""
                INSERT INTO locations (google_place_id, name, type)
                VALUES (:google_place_id, :name, :type)
                RETURNING id, google_place_id, name, type, outlet_availability
            """),
            {
                "google_place_id": body.google_place_id,
                "name": body.name,
                "type": body.type
            }
        )
        await db.commit()
        row = result.fetchone()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Location already exists")

    place = await get_place_details(body.google_place_id)
    return {**row._mapping, **place}

@router.post("/seed", response_model=LocationSeedResponse)
async def seed_locations(
    body: LocationSeedRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bulk cold-start: insert nearby places (from Explore search results) that
    aren't in the DB yet, so the recommender has candidates to rank. Existing
    google_place_ids are left untouched."""
    created = 0
    skipped = 0
    for place in body.places:
        result = await db.execute(
            text("""
                INSERT INTO locations (google_place_id, name, type)
                VALUES (:google_place_id, :name, :type)
                ON CONFLICT (google_place_id) DO NOTHING
                RETURNING id
            """),
            {
                "google_place_id": place.google_place_id,
                "name": place.name,
                "type": place.type,
            }
        )
        if result.fetchone():
            created += 1
        else:
            skipped += 1
    await db.commit()
    return {"created": created, "skipped": skipped}

@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT id, google_place_id, name, type, outlet_availability FROM locations WHERE id = :id"),
        {"id": location_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Location not found")

    place = await get_place_details(row._mapping["google_place_id"])
    return {**row._mapping, **place}