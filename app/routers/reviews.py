from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.auth import get_current_user
from app.schemas.review import ReviewCreate, ReviewResponse
from typing import List

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    body: ReviewCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify location exists
    location = await db.execute(
        text("SELECT id FROM locations WHERE id = :id"),
        {"id": str(body.location_id)}
    )
    if not location.fetchone():
        raise HTTPException(status_code=404, detail="Location not found")

    # Verify session belongs to user if provided
    if body.session_id:
        session = await db.execute(
            text("SELECT id, user_id FROM sessions WHERE id = :id"),
            {"id": str(body.session_id)}
        )
        row = session.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Session not found")
        if str(row._mapping["user_id"]) != user["sub"]:
            raise HTTPException(status_code=403, detail="Not your session")

    # Update outlet_availability on location if provided
    if body.outlet_availability:
        await db.execute(
            text("""
                UPDATE locations
                SET outlet_availability = :outlet_availability
                WHERE id = :id
            """),
            {
                "outlet_availability": body.outlet_availability,
                "id": str(body.location_id)
            }
        )

    result = await db.execute(
        text("""
            INSERT INTO reviews (
                user_id, session_id, location_id,
                stars, opinion, source, time_posted
            )
            VALUES (
                :user_id, :session_id, :location_id,
                :stars, :opinion, 'user', now()
            )
            RETURNING id, user_id, session_id, location_id,
                      stars, opinion, source, time_posted
        """),
        {
            "user_id": user["sub"],
            "session_id": str(body.session_id) if body.session_id else None,
            "location_id": str(body.location_id),
            "stars": body.stars,
            "opinion": body.opinion,
        }
    )
    await db.commit()
    row = result.fetchone()
    return {**row._mapping, "outlet_availability": body.outlet_availability}

@router.get("/location/{location_id}", response_model=List[ReviewResponse])
async def get_location_reviews(
    location_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("""
            SELECT r.id, r.user_id, r.session_id, r.location_id,
                   r.stars, r.opinion, r.source, r.time_posted,
                   l.outlet_availability
            FROM reviews r
            JOIN locations l ON r.location_id = l.id
            WHERE r.location_id = :location_id
            ORDER BY r.time_posted DESC
        """),
        {"location_id": location_id}
    )
    rows = result.fetchall()
    return [dict(row._mapping) for row in rows]