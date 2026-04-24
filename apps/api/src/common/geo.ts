const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(
  sourceLat: number,
  sourceLng: number,
  targetLat: number,
  targetLng: number,
): number {
  const dLat = degreesToRadians(targetLat - sourceLat);
  const dLng = degreesToRadians(targetLng - sourceLng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(degreesToRadians(sourceLat)) *
      Math.cos(degreesToRadians(targetLat)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}
