from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app.db.session import get_db
from app.auth import get_current_user
from app.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["Users"])

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
                INSERT INTO users (id, email, first_name, last_name)
                VALUES (:id, :email, :first_name, :last_name)
            """),
            {
                "id": user["sub"],
                "email": email,
                "first_name": body.first_name,
                "last_name": body.last_name
            }
        )
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Email already in use")

    return {
        "id": user["sub"],
        "email": email,
        "first_name": body.first_name,
        "last_name": body.last_name
    }

@router.get("/me", response_model=UserResponse)
async def get_me(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT id, email, first_name, last_name FROM users WHERE id = :id"),
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
        text("SELECT id, email, first_name, last_name FROM users WHERE id = :id"),
        {"id": user["sub"]}
    )
    return result.fetchone()._mapping