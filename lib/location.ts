export type MapPoint = { lat: number; lng: number };

export function parseMapPoint(value: string | undefined): MapPoint | null {
  if (!value) return null;
  const parts = value.split(",");
  if (parts.length !== 2 || parts.some((part) => !/^-?\d+(?:\.\d+)?$/.test(part.trim()))) return null;
  const [lat, lng] = parts.map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { lat, lng }
    : null;
}

export function serializeMapPoint(point: MapPoint) {
  return `${Number(point.lat.toFixed(6))},${Number(point.lng.toFixed(6))}`;
}

export function googleMapsUrl(value: string | undefined) {
  const point = parseMapPoint(value);
  return point ? `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}` : undefined;
}
