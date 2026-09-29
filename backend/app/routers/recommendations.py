from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional

from app.db.session import get_db
from app.auth import get_current_user
from app.schemas.recommendation import (
    RecommendationItem,
    RecommendationResponse,
    ReindexResponse,
)
from app.services import embeddings
from app.services.places import get_place_details

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

MIN_REVIEWS_TO_UNLOCK = 3


def _parse_pgvector(raw: Optional[str]) -> List[float]:
    """Parse a pgvector text literal '[0.1,0.2,...]' into a list of floats."""
    if not raw:
        return []
    inner = raw.strip().lstrip("[").rstrip("]")
    if not inner:
        return []
    return [float(x) for x in inner.split(",")]


async def _embed_missing_locations(db: AsyncSession) -> int:
    """Compute and store embeddings for every location missing one.

    A location can be embedded from its attributes alone (name, type, outlets),
    so freshly seeded spots with no reviews still become recommendable.
    """
    result = await db.execute(
        text("""
            SELECT l.id,
                   l.name,
                   l.type::text AS type,
                   l.outlet_availability::text AS outlet_availability,
                   AVG(r.stars) AS avg_stars,
                   array_remove(array_agg(r.opinion), NULL) AS opinions
            FROM locations l
            LEFT JOIN reviews r ON r.location_id = l.id
            WHERE l.embedding IS NULL
            GROUP BY l.id
        """)
    )
    rows = result.fetchall()
    embedded = 0
    for row in rows:
        m = row._mapping
        profile = embeddings.build_location_text(
            name=m["name"],
            loc_type=m["type"],
            outlet_availability=m["outlet_availability"],
            avg_stars=float(m["avg_stars"]) if m["avg_stars"] is not None else None,
            opinions=m["opinions"] or [],
        )
        vec = embeddings.embed_text(profile)
        if vec is None:
            continue
        await db.execute(
            text("UPDATE locations SET embedding = :emb ::vector WHERE id = :id"),
            {"emb": embeddings.to_pgvector(vec), "id": str(m["id"])},
        )
        embedded += 1
    return embedded


async def _compute_user_embedding(db: AsyncSession, user_id: str) -> bool:
    """Recompute and store a user's taste embedding from their review history.

    User embedding = L2-normalized weighted mean of the embeddings of the
    locations they reviewed, where weight = source/session weight * (stars/5).
    Returns True if an embedding was stored.
    """
    result = await db.execute(
        text("""
            SELECT r.stars,
                   r.source,
                   (r.session_id IS NOT NULL) AS session_backed,
                   l.embedding::text AS emb
            FROM reviews r
            JOIN locations l ON l.id = r.location_id
            WHERE r.user_id = :uid AND l.embedding IS NOT NULL
        """),
        {"uid": user_id},
    )
    rows = result.fetchall()

    vectors: List[List[float]] = []
    weights: List[float] = []
    for row in rows:
        m = row._mapping
        vec = _parse_pgvector(m["emb"])
        if not vec:
            continue
        w = embeddings.review_weight(m["source"], m["session_backed"]) * (m["stars"] / 5.0)
        vectors.append(vec)
        weights.append(w)

    user_vec = embeddings.weighted_mean(vectors, weights)
    if user_vec is None:
        return False

    await db.execute(
        text("UPDATE users SET embedding = :emb ::vector WHERE id = :uid"),
        {"emb": embeddings.to_pgvector(user_vec), "uid": user_id},
    )
    return True


@router.post("/reindex", response_model=ReindexResponse)
async def reindex(
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Embed any locations missing an embedding and recompute the caller's
    taste embedding. Safe to call after submitting reviews or seeding spots."""
    if not embeddings.embeddings_available():
        raise HTTPException(
            status_code=503,
            detail="Recommendation model unavailable. Install sentence-transformers.",
        )
    locations_embedded = await _embed_missing_locations(db)
    user_embedded = await _compute_user_embedding(db, user["sub"])
    await db.commit()
    return {"locations_embedded": locations_embedded, "user_embedded": user_embedded}


@router.get("", response_model=RecommendationResponse)
async def get_recommendations(
    limit: int = Query(10, ge=1, le=25),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Personalized study-spot recommendations ranked by cosine similarity
    between the user's taste embedding and each location's embedding.

    Locked until the user has submitted at least 3 reviews."""
    # Gate: require a minimum number of reviews.
    count_res = await db.execute(
        text("SELECT count(*) AS n FROM reviews WHERE user_id = :uid"),
        {"uid": user["sub"]},
    )
    n_reviews = count_res.fetchone()._mapping["n"]
    if n_reviews < MIN_REVIEWS_TO_UNLOCK:
        return {
            "unlocked": False,
            "reviews_needed": MIN_REVIEWS_TO_UNLOCK - n_reviews,
            "recommendations": [],
        }

    if not embeddings.embeddings_available():
        raise HTTPException(
            status_code=503,
            detail="Recommendation model unavailable. Install sentence-transformers.",
        )

    # Make sure candidate locations and the user's embedding are up to date.
    await _embed_missing_locations(db)
    has_embedding = await _compute_user_embedding(db, user["sub"])
    await db.commit()

    if not has_embedding:
        # Reviewed spots had no embeddable data; nothing to rank against.
        return {"unlocked": True, "reviews_needed": 0, "recommendations": []}

    user_emb_res = await db.execute(
        text("SELECT embedding::text AS emb FROM users WHERE id = :uid"),
        {"uid": user["sub"]},
    )
    user_emb = user_emb_res.fetchone()._mapping["emb"]

    ranked = await db.execute(
        text("""
            SELECT l.id,
                   l.google_place_id,
                   l.name,
                   l.type::text AS type,
                   l.outlet_availability::text AS outlet_availability,
                   AVG(r.stars) AS caffin_rating,
                   count(r.id) AS review_count,
                   1 - (l.embedding <=> :uemb ::vector) AS similarity
            FROM locations l
            LEFT JOIN reviews r ON r.location_id = l.id
            WHERE l.embedding IS NOT NULL
              AND l.id NOT IN (
                  SELECT location_id FROM reviews WHERE user_id = :uid
              )
            GROUP BY l.id
            ORDER BY l.embedding <=> :uemb ::vector
            LIMIT :limit
        """),
        {"uemb": user_emb, "uid": user["sub"], "limit": limit},
    )
    rows = ranked.fetchall()

    items = []
    for row in rows:
        m = dict(row._mapping)
        if m.get("caffin_rating") is not None:
            m["caffin_rating"] = round(float(m["caffin_rating"]), 2)
        m["similarity"] = round(float(m["similarity"]), 4)
        # Merge live Google Places data (address, photo, Google rating).
        place = await get_place_details(m["google_place_id"])
        m.update({
            "address": place.get("address"),
            "photo_url": place.get("photo_url"),
            "rating": place.get("rating"),
        })
        items.append(m)

    return {"unlocked": True, "reviews_needed": 0, "recommendations": items}
