const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

/** Initial bearing from current position to Kaaba, clockwise from true north. */
export function qiblaBearing(latitude: number, longitude: number): number {
  const lat1 = degToRad(latitude);
  const lat2 = degToRad(KAABA_LAT);
  const dLon = degToRad(KAABA_LON - longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = radToDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}
