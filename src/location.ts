export type GeoPoint = {
  latitude: number;
  longitude: number;
};

const GEO_OPTS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 25000,
};

/**
 * Best-effort position for Qibla: prefers a fresh, accurate GNSS fix by sampling
 * `watchPosition` briefly and keeping the reading with lowest reported accuracy.
 */
export async function acquireBestPosition(): Promise<GeoPoint> {
  if (!("geolocation" in navigator)) {
    throw new Error("GEO_NOT_SUPPORTED");
  }

  return new Promise<GeoPoint>((resolve, reject) => {
    let best: { point: GeoPoint; acc: number } | null = null;
    let settled = false;
    let watchId: number | undefined;

    const cleanup = (): void => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
        watchId = undefined;
      }
    };

    const finish = (point: GeoPoint): void => {
      if (settled) return;
      settled = true;
      cleanup();
      clearTimeout(timeoutId);
      resolve(point);
    };

    const deny = (): void => {
      if (settled) return;
      settled = true;
      cleanup();
      clearTimeout(timeoutId);
      reject(new Error("GEO_DENIED"));
    };

    const consider = (p: GeolocationPosition): void => {
      const acc = p.coords.accuracy ?? 99999;
      const point: GeoPoint = {
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
      };
      if (!best || acc < best.acc) best = { point, acc };
      if (acc <= 40) finish(point);
    };

    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      if (best) finish(best.point);
      else {
        settled = true;
        cleanup();
        reject(new Error("GEO_FAILED"));
      }
    }, 12000);

    watchId = navigator.geolocation.watchPosition(
      consider,
      (err) => {
        if (err.code === 1) deny();
      },
      GEO_OPTS
    );

    navigator.geolocation.getCurrentPosition(
      (p) => consider(p),
      (err) => {
        if (err.code === 1) deny();
      },
      GEO_OPTS
    );
  });
}

export async function detectCurrentPosition(): Promise<GeoPoint> {
  return acquireBestPosition();
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
