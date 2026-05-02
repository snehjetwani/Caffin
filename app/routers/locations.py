from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app.db.session import get_db
from app.auth import get_current_user
from app.schemas.location import LocationCreate, LocationResponse
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
        text("SELECT id, name, type, outlet_availability FROM locations WHERE google_place_id = :gid"),
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