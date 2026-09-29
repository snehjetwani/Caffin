"""Embedding service for the Caffin recommendation system.

Uses sentence-transformers (all-MiniLM-L6-v2 -> 384 dims) to turn a location's
or user's profile text into a vector that pgvector ranks by cosine distance.

The model is loaded lazily on first use so that importing this module (and
therefore starting the API) never requires torch to be installed. Endpoints
that need embeddings check `embeddings_available()` first and return a clear
503 if the dependency is missing.

Install the dependency with:
    pip install sentence-transformers
"""

import math
from typing import List, Optional, Sequence

EMBEDDING_DIM = 384
_MODEL_NAME = "all-MiniLM-L6-v2"

_model = None
_load_attempted = False

# Review source weighting from the project spec:
#   session-backed user review = 1.0
#   standalone user review      = 0.7
#   google-seeded review        = 0.4
WEIGHT_SESSION_BACKED = 1.0
WEIGHT_STANDALONE_USER = 0.7
WEIGHT_GOOGLE = 0.4

_OUTLET_PHRASES = {
    "NONE": "no power outlets available",
    "LOW": "a few power outlets",
    "MEDIUM": "a moderate number of power outlets",
    "HIGH": "plenty of power outlets",
}


def _get_model():
    """Lazily load the sentence-transformers model. Returns None if unavailable."""
    global _model, _load_attempted
    if _model is None and not _load_attempted:
        _load_attempted = True
        try:
            from sentence_transformers import SentenceTransformer

            _model = SentenceTransformer(_MODEL_NAME)
        except Exception:
            _model = None
    return _model


def embeddings_available() -> bool:
    """True when the embedding model can be loaded (dependency installed)."""
    return _get_model() is not None


def embed_text(text: str) -> Optional[List[float]]:
    """Encode text into a normalized 384-dim vector, or None if model missing."""
    model = _get_model()
    if model is None:
        return None
    vec = model.encode(text or "", normalize_embeddings=True)
    return [float(x) for x in vec]


def review_weight(source: str, session_backed: bool) -> float:
    """Map a review's (source, session_backed) to its ML weight."""
    if source == "google":
        return WEIGHT_GOOGLE
    return WEIGHT_SESSION_BACKED if session_backed else WEIGHT_STANDALONE_USER


def build_location_text(
    name: str,
    loc_type: str,
    outlet_availability: Optional[str],
    avg_stars: Optional[float],
    opinions: Optional[Sequence[str]] = None,
) -> str:
    """Compose the natural-language profile a location is embedded from."""
    parts: List[str] = [f"{name}.", f"This is a {loc_type} study spot."]
    if outlet_availability in _OUTLET_PHRASES:
        parts.append(f"It has {_OUTLET_PHRASES[outlet_availability]}.")
    if avg_stars is not None:
        parts.append(f"Average study rating {avg_stars:.1f} out of 5.")
    clean = [o.strip() for o in (opinions or []) if o and o.strip()]
    if clean:
        parts.append("What people say: " + " ".join(clean[:20]))
    return " ".join(parts)


def weighted_mean(
    vectors: Sequence[Sequence[float]], weights: Sequence[float]
) -> Optional[List[float]]:
    """Weighted mean of vectors, L2-normalized. None if empty or degenerate."""
    if not vectors:
        return None
    dim = len(vectors[0])
    acc = [0.0] * dim
    for vec, w in zip(vectors, weights):
        if not vec:
            continue
        for i in range(dim):
            acc[i] += vec[i] * w
    norm = math.sqrt(sum(x * x for x in acc))
    if norm == 0.0:
        return None
    return [x / norm for x in acc]


def to_pgvector(vec: Sequence[float]) -> str:
    """Format a vector as a pgvector string literal: '[0.1,0.2,...]'."""
    return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"
