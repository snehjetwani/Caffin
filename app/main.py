from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.auth import get_current_user
from app.routers import users, locations, sessions, reviews, friends

app = FastAPI(title="Caffin API")

app.include_router(users.router)
app.include_router(locations.router)
app.include_router(sessions.router)
app.include_router(reviews.router)
app.include_router(friends.router)

@app.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}

@app.get("/me")
async def me(user=Depends(get_current_user)):
    return {"user_id": user["sub"], "email": user.get("email")}