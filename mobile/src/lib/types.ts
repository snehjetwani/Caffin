// API response shapes — mirror the FastAPI Pydantic schemas in backend/app/schemas.

export type OutletAvailability = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
export type LocationType = 'library' | 'cafe' | 'academic_building' | 'other';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
}

export interface UserSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  is_self: boolean;
  is_friend: boolean;
  total_sessions?: number | null;
  favorite_spot?: string | null;
}

// A place returned from Google Places search (nothing persisted yet).
export interface PlaceSearchResult {
  google_place_id: string;
  name: string;
  address?: string | null;
  rating?: number | null;
  photo_url?: string | null;
}

export interface Location {
  id: string;
  google_place_id: string;
  name: string;
  type: LocationType;
  outlet_availability: OutletAvailability;
  address?: string | null;
  photo_url?: string | null;
  website?: string | null;
  opening_hours?: string | null;
  rating?: number | null;
}

export interface StudySession {
  id: string;
  user_id: string;
  location_id: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
}

export interface Review {
  id: string;
  user_id: string;
  session_id?: string | null;
  location_id: string;
  stars: number;
  opinion?: string | null;
  outlet_availability?: OutletAvailability | null;
  source: string;
  time_posted: string;
  photos: string[];
}

export interface Friend {
  user_id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  date_established: string;
}

export interface FeedItem {
  session_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  location_id: string | null;
  location_name: string | null;
  start_time: string;
  end_time: string | null;
  stars: number | null;
  opinion: string | null;
  duration_minutes: number | null;
}

export interface Recommendation {
  id: string;
  google_place_id: string;
  name: string;
  type: LocationType;
  outlet_availability: OutletAvailability;
  caffin_rating?: number | null;
  review_count: number;
  similarity: number;
  address?: string | null;
  photo_url?: string | null;
  rating?: number | null;
}

export interface RecommendationResponse {
  unlocked: boolean;
  reviews_needed: number;
  recommendations: Recommendation[];
}
