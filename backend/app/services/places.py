import httpx
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
BASE_URL = "https://places.googleapis.com/v1"

async def get_place_details(google_place_id: str) -> dict:
    url = f"{BASE_URL}/places/{google_place_id}"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "displayName,formattedAddress,websiteUri,regularOpeningHours,rating,photos"
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        if response.status_code != 200:
            return {}
        data = response.json()

    photo_url = None
    if data.get("photos"):
        photo_name = data["photos"][0]["name"]
        photo_url = f"{BASE_URL}/{photo_name}/media?maxHeightPx=800&key={API_KEY}"

    hours = None
    if data.get("regularOpeningHours"):
        weekday_text = data["regularOpeningHours"].get("weekdayDescriptions", [])
        hours = " | ".join(weekday_text)

    return {
        "address": data.get("formattedAddress"),
        "website": data.get("websiteUri"),
        "rating": data.get("rating"),
        "photo_url": photo_url,
        "opening_hours": hours
    }

async def search_places(query: str, lat: float, lng: float) -> list:
    url = f"{BASE_URL}/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.photos"
    }
    body = {
        "textQuery": query,
        "locationBias": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 2000.0
            }
        }
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=body)
        if response.status_code != 200:
            return []
        data = response.json()

    results = []
    for place in data.get("places", []):
        photo_url = None
        if place.get("photos"):
            photo_name = place["photos"][0]["name"]
            photo_url = f"{BASE_URL}/{photo_name}/media?maxHeightPx=400&key={API_KEY}"
        results.append({
            "google_place_id": place["id"],
            "name": place["displayName"]["text"],
            "address": place.get("formattedAddress"),
            "rating": place.get("rating"),
            "photo_url": photo_url
        })
    return results