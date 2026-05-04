from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.auth import get_current_user
from app.schemas.friend import FriendResponse, FeedItem
from typing import List

router = APIRouter(tags=["Friends"])

@router.post("/friends/{user_id}", status_code=status.HTTP_201_CREATED)
async def add_friend(
    user_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    me = user["sub"]

    if me == user_id:
        raise HTTPException(status_code=400, detail="You can't friend yourself")

    # Enforce user_1 < user_2 constraint
    user_1 = min(me, user_id)
    user_2 = max(me, user_id)

    # Check the other user exists
    other = await db.execute(
        text("SELECT id FROM users WHERE id = :id"),
        {"id": user_id}
    )
    if not other.fetchone():
        raise HTTPException(status_code=404, detail="User not found")

    # Check not already friends
    existing = await db.execute(
        text("SELECT 1 FROM friends WHERE user_1 = :u1 AND user_2 = :u2"),
        {"u1": user_1, "u2": user_2}
    )
    if existing.fetchone():
        raise HTTPException(status_code=409, detail="Already friends")

    await db.execute(
        text("""
            INSERT INTO friends (user_1, user_2, date_established)
            VALUES (:u1, :u2, now())
        """),
        {"u1": user_1, "u2": user_2}
    )
    await db.commit()
    return {"message": "Friend added successfully"}

@router.delete("/friends/{user_id}", status_code=status.HTTP_200_OK)
async def remove_friend(
    user_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    me = user["sub"]
    user_1 = min(me, user_id)
    user_2 = max(me, user_id)

    result = await db.execute(
        text("DELETE FROM friends WHERE user_1 = :u1 AND user_2 = :u2"),
        {"u1": user_1, "u2": user_2}
    )
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Friendship not found")

    return {"message": "Friend removed successfully"}

@router.get("/friends", response_model=List[FriendResponse])
async def get_friends(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    me = user["sub"]
    result = await db.execute(
        text("""
            SELECT
                u.id as user_id,
                u.first_name,
                u.last_name,
                u.email,
                f.date_established
            FROM friends f
            JOIN users u ON (
                CASE WHEN f.user_1 = :me THEN f.user_2 ELSE f.user_1 END = u.id
            )
            WHERE f.user_1 = :me OR f.user_2 = :me
            ORDER BY f.date_established DESC
        """),
        {"me": me}
    )
    return [dict(row._mapping) for row in result.fetchall()]

@router.get("/feed", response_model=List[FeedItem])
async def get_feed(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    me = user["sub"]
    result = await db.execute(
        text("""
            SELECT
                s.id as session_id,
                s.user_id,
                u.first_name,
                u.last_name,
                s.location_id,
                l.name as location_name,
                s.start_time,
                s.end_time,
                r.stars,
                r.opinion
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN locations l ON s.location_id = l.id
            LEFT JOIN reviews r ON r.session_id = s.id
            WHERE s.user_id IN (
                SELECT CASE WHEN user_1 = :me THEN user_2 ELSE user_1 END
                FROM friends
                WHERE user_1 = :me OR user_2 = :me
                UNION
                SELECT :me
            )
            ORDER BY s.start_time DESC
            LIMIT 50
        """),
        {"me": me}
    )
    rows = result.fetchall()
    feed = []
    for row in rows:
        mapping = dict(row._mapping)
        duration = None
        if mapping["end_time"] and mapping["start_time"]:
            delta = mapping["end_time"] - mapping["start_time"]
            duration = int(delta.total_seconds() / 60)
        feed.append({**mapping, "duration_minutes": duration})
    return feed