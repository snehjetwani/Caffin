from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app.db.session import get_db
from app.auth import get_current_user
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserSearchResponse,
    normalize_username,
)

router = APIRouter(prefix="/users", tags=["Users"])

# Highest average stars across the user's reviewed sessions, ties broken by
# total hours studied there.
FAVORITE_SPOT_SQL = """
    SELECT l.name
    FROM sessions s
    JOIN reviews r ON r.session_id = s.id
    JOIN locations l ON s.location_id = l.id
    WHERE s.user_id = :id AND s.end_time IS NOT NULL
    GROUP BY l.id, l.name
    ORDER BY AVG(r.stars) DESC,
             SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600) DESC
    LIMIT 1
"""


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(
        text("SELECT id FROM users WHERE id = :id"),
        {"id": user["sub"]}
    )
    if existing.fetchone():
        raise HTTPException(status_code=409, detail="User already exists")

    email = user.get("email")

    try:
        await db.execute(
            text("""
                INSERT INTO users (id, email, first_name, last_name, username)
                VALUES (:id, :email, :first_name, :last_name, :username)
            """),
            {
                "id": user["sub"],
                "email": email,
                "first_name": body.first_name,
                "last_name": body.last_name,
                "username": body.username
            }
        )
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        # Constraint names (users_username_key / users_email_key) carry the
        # column, so the client gets a message it can attach to the right field.
        violation = str(e.orig).lower()
        if "username" in violation:
            raise HTTPException(status_code=409, detail="Username already taken")
        if "email" in violation:
            raise HTTPException(status_code=409, detail="Email already in use")
        raise HTTPException(status_code=409, detail="Could not create user")

    return {
        "id": user["sub"],
        "email": email,
        "first_name": body.first_name,
        "last_name": body.last_name,
        "username": body.username
    }


@router.get("/me", response_model=UserResponse)
async def get_me(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT id, email, first_name, last_name, username FROM users WHERE id = :id"),
        {"id": user["sub"]}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return row._mapping


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdate,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(
        text("""
            UPDATE users
            SET
                first_name = COALESCE(:first_name, first_name),
                last_name = COALESCE(:last_name, last_name)
            WHERE id = :id
        """),
        {
            "id": user["sub"],
            "first_name": body.first_name,
            "last_name": body.last_name
        }
    )
    await db.commit()

    result = await db.execute(
        text("SELECT id, email, first_name, last_name, username FROM users WHERE id = :id"),
        {"id": user["sub"]}
    )
    return result.fetchone()._mapping


@router.get("/search", response_model=UserSearchResponse)
async def search_user(
    username: str = Query(..., description="Exact username, case insensitive"),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    me = user["sub"]

    try:
        wanted = normalize_username(username)
    except ValueError:
        # A malformed username can't match any stored row
        raise HTTPException(status_code=404, detail="User not found")

    result = await db.execute(
        text("SELECT id, first_name, last_name, username FROM users WHERE username = :username"),
        {"username": wanted}
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")

    found = dict(row._mapping)
    found_id = str(found["id"])
    is_self = found_id == me

    is_friend = False
    if not is_self:
        friendship = await db.execute(
            text("SELECT 1 FROM friends WHERE user_1 = :u1 AND user_2 = :u2"),
            {"u1": min(me, found_id), "u2": max(me, found_id)}
        )
        is_friend = friendship.fetchone() is not None

    profile = {**found, "is_self": is_self, "is_friend": is_friend}

    # Non-friends get the card only
    if not (is_self or is_friend):
        return profile

    total = await db.execute(
        text("SELECT count(*) AS total FROM sessions WHERE user_id = :id"),
        {"id": found_id}
    )
    favorite = await db.execute(text(FAVORITE_SPOT_SQL), {"id": found_id})
    favorite_row = favorite.fetchone()

    return {
        **profile,
        "total_sessions": total.scalar_one(),
        "favorite_spot": favorite_row[0] if favorite_row else None,
    }
