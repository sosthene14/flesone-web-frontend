// hooks/useReverseGeocode.ts
//
// Reverse-geocoding via l'instance Nominatim déjà utilisée ailleurs dans
// l'app (voir components/lines/ZoneFormDialog.tsx) — convertit une paire de
// coordonnées GPS en nom de lieu lisible ("Route des Niayes, Dakar...").
import { useEffect, useRef, useState } from 'react';

const NOMINATIM_URL = import.meta.env.VITE_NOMINATIM_URL || 'http://localhost:5004';

interface NominatimReverseResult {
  display_name?: string;
  error?: string;
}

// Cache en mémoire partagé entre tous les composants qui utilisent ce hook
// (ex: plusieurs véhicules sélectionnés successivement sur "Suivi en direct")
// — évite de refaire un appel réseau pour une position déjà résolue.
const cache = new Map<string, string>();

// Arrondi à ~3 décimales (~110m) : un véhicule en mouvement change de
// coordonnées en continu, ça évite un appel Nominatim à chaque tick GPS pour
// un déplacement de quelques mètres qui ne change pas le nom du lieu.
function roundKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

export function useReverseGeocode(lat: number | null, lon: number | null) {
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (lat == null || lon == null) {
      setPlaceName(null);
      return;
    }
    const key = roundKey(lat, lon);
    const cached = cache.get(key);
    if (cached) {
      setPlaceName(cached);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon), format: 'json' });

    fetch(`${NOMINATIM_URL}/reverse?${params}`)
      .then((res) => res.json())
      .then((data: NominatimReverseResult) => {
        if (requestId !== requestIdRef.current) return; // réponse obsolète (nouvelle position entre-temps)
        if (data?.display_name) {
          cache.set(key, data.display_name);
          setPlaceName(data.display_name);
        } else {
          setPlaceName(null);
        }
      })
      .catch(() => {
        if (requestId === requestIdRef.current) setPlaceName(null);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setIsLoading(false);
      });
  }, [lat, lon]);

  return { placeName, isLoading };
}
