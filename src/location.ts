export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export async function detectCurrentPosition(): Promise<GeoPoint> {
  if (!("geolocation" in navigator)) {
    throw new Error("GEO_NOT_SUPPORTED");
  }
  return new Promise<GeoPoint>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        }),
      () => reject(new Error("GEO_DENIED")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 }
    );
  });
}

export async function reverseGeocodeCity(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=sv`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    address?: Record<string, string | undefined>;
  };
  const addr = data.address ?? {};
  return (
    addr.city ??
    addr.town ??
    addr.village ??
    addr.municipality ??
    addr.county ??
    null
  );
}
