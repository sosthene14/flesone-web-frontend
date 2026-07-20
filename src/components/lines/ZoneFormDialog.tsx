import { useState, useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Loader2 } from "lucide-react";
import { useZoneStore, Zone } from "@/store/useZoneStore";
import { apiService } from "@/services/apiService";

interface City {
  id: string;
  name: string;
  country_code: string;
}

interface Country {
  code: string;
  name: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface ZoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Zone | null;
  onSuccess?: () => void;
}

const NOMINATIM_URL = import.meta.env.VITE_NOMINATIM_URL || "http://localhost:5004";
const SENEGAL_CENTER: [number, number] = [-17.4441, 14.6928]
const SENEGAL_DEFAULT_ZOOM = 12;

export function ZoneFormDialog({ open, onOpenChange, initialData, onSuccess }: ZoneFormDialogProps) {
  const { createZone, updateZone, isLoading } = useZoneStore();
  const isEditing = !!initialData;

  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [cityId, setCityId] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  // Garde synchrone contre la double soumission (double-clic, ou touche
  // Entrée + clic quasi simultanés) : `isLoading` du store ne se reflète sur
  // le bouton qu'après le prochain rendu React, ce qui laisse une fenêtre où
  // un second clic peut relancer handleSubmit avant que le bouton ne soit
  // effectivement désactivé — bug signalé : plusieurs zones identiques
  // créées d'affilée depuis ce formulaire.
  const isSubmittingRef = useRef(false);

  // Reverse-geocoding : quand on clique sur la carte, on retrouve l'adresse
  // correspondant aux coordonnées via Nominatim pour remplir le champ recherche.
  const reverseGeocode = useCallback(async (coords: { lat: number; lng: number }) => {
    setIsReverseGeocoding(true);
    setShowResults(false);
    try {
      const params = new URLSearchParams({
        lat: String(coords.lat),
        lon: String(coords.lng),
        format: "json",
      });
      const res = await fetch(`${NOMINATIM_URL}/reverse?${params}`);
      const data = (await res.json()) as NominatimResult & { error?: string };
      if (data && data.display_name) {
        setSearchQuery(data.display_name);
      }
    } catch {
      // silencieux : la position reste placée même si l'adresse n'a pas pu être résolue
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    apiService
      .get("/countries")
      .then((res) => {
        const list = (res.data as Country[]) || [];
        setCountries([...list].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setCountries([]));
    apiService
      .get("/cities")
      .then((res) => {
        const list = (res.data as City[]) || [];
        setCities([...list].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setCities([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setName(initialData.name);
      setCityId(initialData.city_id);
      const city = cities.find((c) => c.id === initialData.city_id);
      setCountryCode(city?.country_code || "");
      setPosition({ lat: initialData.latitude, lng: initialData.longitude });
      setSearchQuery(initialData.address || "");
    } else {
      setName("");
      setCountryCode("");
      setCityId("");
      setPosition(null);
      setSearchQuery("");
    }
    setSearchResults([]);
    setShowResults(false);
    setError("");
  }, [initialData, open, cities]);

  // Réinitialise la ville sélectionnée si elle n'appartient plus au pays choisi
  useEffect(() => {
    if (!countryCode) return;
    const city = cities.find((c) => c.id === cityId);
    if (city && city.country_code !== countryCode) {
      setCityId("");
    }
  }, [countryCode]);

  const citiesForCountry = countryCode
    ? cities.filter((c) => c.country_code === countryCode)
    : [];

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    let raf2 = 0;

    // rAF (x2) : on attend que le DOM de la Dialog (portée + animée par Radix)
    // soit réellement peint avant d'instancier MapLibre. Sans ça, sur certains
    // navigateurs/portails, `mapContainer.current` peut être null ou avoir une
    // taille non fiable au moment exact où l'effet s'exécute, et MapLibre
    // n'émet même pas la requête de style — la carte reste vide sans erreur.
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled || !mapContainer.current || mapRef.current) return;

        try {
          const map = new maplibregl.Map({
            container: mapContainer.current,
            style: "https://tiles.openfreemap.org/styles/liberty",
            center: position ? [position.lng, position.lat] : SENEGAL_CENTER,
            zoom: position ? 14 : SENEGAL_DEFAULT_ZOOM,
            attributionControl: false,
          });

          map.addControl(new maplibregl.NavigationControl(), "top-right");
          map.on("click", (e) => {
            const clicked = { lat: e.lngLat.lat, lng: e.lngLat.lng };
            setPosition(clicked);
            reverseGeocode(clicked);
          });
          map.on("error", (e) => console.error("[ZoneFormDialog] erreur MapLibre :", e.error));
          // Le style "liberty" référence des icônes de POI (bornes, piscines...)
          // absentes de la sprite sheet : évite le warning console inoffensif.
          map.on("styleimagemissing", (e) => {
            if (!map.hasImage(e.id)) {
              map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
            }
          });

          mapRef.current = map;

          map.once("load", () => map.resize());
          resizeTimeout = setTimeout(() => map.resize(), 250);

          resizeObserver = new ResizeObserver(() => map.resize());
          resizeObserver.observe(mapContainer.current);
        } catch (err) {
          console.error("[ZoneFormDialog] échec d'initialisation de la carte :", err);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeObserver?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!mapRef.current || !position) return;
    if (markerRef.current) {
      markerRef.current.setLngLat([position.lng, position.lat]);
    } else {
      markerRef.current = new maplibregl.Marker({ color: "#6A0DAD" })
        .setLngLat([position.lng, position.lat])
        .addTo(mapRef.current);
    }
    mapRef.current.flyTo({ center: [position.lng, position.lat], zoom: 15 });
  }, [position]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({ q: value, format: "json", countrycodes: "sn", limit: "6" });
        const res = await fetch(`${NOMINATIM_URL}/search?${params}`);
        const data = (await res.json()) as NominatimResult[];
        setSearchResults(data);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  const handleSelectResult = (result: NominatimResult) => {
    setPosition({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setSearchQuery(result.display_name);
    setShowResults(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setError("");

    if (!name.trim()) return setError("Le nom est requis");
    if (!cityId) return setError("Sélectionnez une ville");
    if (!position) return setError("Placez un point sur la carte ou recherchez une adresse");

    const payload = {
      name: name.trim(),
      city_id: cityId,
      latitude: position.lat,
      longitude: position.lng,
      address: searchQuery.trim() || undefined,
    };

    isSubmittingRef.current = true;
    try {
      if (isEditing && initialData) {
        await updateZone(initialData.id, payload);
      } else {
        await createZone(payload);
      }
      onSuccess?.();
    } catch {
      //
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier la zone" : "Nouvelle zone"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Modifiez les informations de la zone ci-dessous." : "Recherchez une adresse ou cliquez sur la carte pour placer la zone."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zone-name">Nom de la zone</Label>
            <Input id="zone-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Parcelles Assainies" disabled={isLoading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone-country">Pays</Label>
            <Combobox
              value={countryCode}
              onChange={setCountryCode}
              disabled={isLoading}
              placeholder="Choisir un pays"
              searchPlaceholder="Rechercher un pays..."
              options={countries.map((country) => ({
                value: country.code,
                label: country.name,
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone-city">Ville</Label>
            <Combobox
              value={cityId}
              onChange={setCityId}
              disabled={isLoading || !countryCode}
              placeholder={countryCode ? "Choisir une ville" : "Choisissez d'abord un pays"}
              searchPlaceholder="Rechercher une ville..."
              options={citiesForCountry.map((city) => ({
                value: city.id,
                label: city.name,
              }))}
            />
          </div>

          <div className="space-y-2 relative">
            <Label htmlFor="zone-search">Rechercher une adresse</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
              <Input
                id="zone-search"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                placeholder="Ex: Marché Sandaga, Dakar"
                className="pl-8"
                disabled={isLoading || isReverseGeocoding}
              />
              {(isSearching || isReverseGeocoding) && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-text-muted" />
              )}
            </div>

            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-md max-h-52 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => handleSelectResult(result)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-md hover:bg-accent-soft transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-text-muted" />
                    <span className="truncate">{result.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Position</Label>
            <div ref={mapContainer} className="h-64 w-full rounded-md border border-border overflow-hidden" />
            {position && <p className="text-xs text-text-muted">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</p>}
          </div>

          {error && <p className="text-md text-danger">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Annuler</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "En cours..." : isEditing ? "Mettre à jour" : "Créer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}