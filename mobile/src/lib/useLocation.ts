import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export interface Coords {
  lat: number;
  lng: number;
}

interface LocationState {
  coords: Coords | null;
  loading: boolean;
  denied: boolean;
  request: () => Promise<void>;
}

/**
 * One-shot foreground location. Requests permission on mount and fetches the
 * current position. `request()` retries after a denial (e.g. from a button).
 */
export function useDeviceLocation(): LocationState {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const request = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDenied(true);
        return;
      }
      setDenied(false);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      setDenied(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  return { coords, loading, denied, request };
}
