from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.auth import get_current_user
from app.schemas.session import SessionCreate, SessionEnd, SessionResponse
from typing import List

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def start_session(
    body: SessionCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("""
            INSERT INTO sessions (user_id, location_id, start_time)
            VALUES (:user_id, :location_id, now())
            RETURNING id, user_id, location_id, start_time, end_time
        """),
        {
            "user_id": user["sub"],
            "location_id": str(body.location_id) if body.location_id else None
        }
    )
    await db.commit()
    row = result.fetchone()
    return {**row._mapping, "duration_minutes": None}

@router.patch("/{session_id}", response_model=SessionResponse)
async def end_session(
    session_id: str,
    body: SessionEnd,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT id, user_id FROM sessions WHERE id = :id"),
        {"id": session_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(row._mapping["user_id"]) != user["sub"]:
        raise HTTPException(status_code=403, detail="Not your session")

    result = await db.execute(
        text("""
            UPDATE sessions
            SET end_time = :end_time
            WHERE id = :id
            RETURNING id, user_id, location_id, start_time, end_time
        """),
        {"id": session_id, "end_time": body.end_time}
    )
    await db.commit()
    row = result.fetchone()
    mapping = dict(row._mapping)

    duration = None
    if mapping["end_time"] and mapping["start_time"]:
        delta = mapping["end_time"] - mapping["start_time"]
        duration = int(delta.total_seconds() / 60)

    return {**mapping, "duration_minutes": duration}

@router.get("/me", response_model=List[SessionResponse])
async def get_my_sessions(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("""
            SELECT id, user_id, location_id, start_time, end_time
            FROM sessions
            WHERE user_id = :user_id
            ORDER BY start_time DESC
        """),
        {"user_id": user["sub"]}
    )
    rows = result.fetchall()
    sessions = []
    for row in rows:
        mapping = dict(row._mapping)
        duration = None
        if mapping["end_time"] and mapping["start_time"]:
            delta = mapping["end_time"] - mapping["start_time"]
            duration = int(delta.total_seconds() / 60)
        sessions.append({**mapping, "duration_minutes": duration})
    return sessions

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("""
            SELECT id, user_id, location_id, start_time, end_time
            FROM sessions WHERE id = :id
        """),
        {"id": session_id}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    mapping = dict(row._mapping)
    duration = None
    if mapping["end_time"] and mapping["start_time"]:
        delta = mapping["end_time"] - mapping["start_time"]
        duration = int(delta.total_seconds() / 60)
    return {**mapping, "duration_minutes": duration}