/** Compass heading utilities for DeviceOrientation (0–360°, clockwise from true north). */

export function normalizeDeg(value: number): number {
  return ((value % 360) + 360) % 360;
}

/** Circular linear interpolation for smoothing headings. */
export function lerpHeading(from: number, to: number, t: number): number {
  const a = normalizeDeg(from);
  const b = normalizeDeg(to);
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return normalizeDeg(a + d * t);
}

type OrientationExt = DeviceOrientationEvent & {
  webkitCompassHeading?: number | null;
};

/**
 * True/magnetic compass heading from a device orientation event.
 * Prefers iOS webkit compass, then absolute orientation, then tilt-compensated euler fallback.
 */
export function headingFromOrientationEvent(e: OrientationExt): number | null {
  if (
    typeof e.webkitCompassHeading === "number" &&
    Number.isFinite(e.webkitCompassHeading)
  ) {
    return normalizeDeg(e.webkitCompassHeading);
  }

  const { alpha, beta, gamma } = e;
  if (
    alpha == null ||
    beta == null ||
    gamma == null ||
    !Number.isFinite(alpha) ||
    !Number.isFinite(beta) ||
    !Number.isFinite(gamma)
  ) {
    return null;
  }

  // Absolute frame (Chrome/Android): compass heading from alpha in the Earth frame.
  if (e.absolute === true) {
    return normalizeDeg(360 - alpha);
  }

  // Tilt-compensated compass from euler angles (device may be held at an angle).
  const rad = Math.PI / 180;
  const xR = beta * rad;
  const yR = gamma * rad;
  const zR = alpha * rad;
  const cY = Math.cos(yR);
  const cZ = Math.cos(zR);
  const sX = Math.sin(xR);
  const sY = Math.sin(yR);
  const sZ = Math.sin(zR);
  const xh = -cZ * sY - sZ * sX * cY;
  const yh = sZ * sY - cZ * sX * cY;
  if (Math.abs(xh) < 1e-9 && Math.abs(yh) < 1e-9) return null;
  let heading = (Math.atan2(xh, yh) * 180) / Math.PI;
  return normalizeDeg(heading);
}

/** Whether `deviceorientationabsolute` is likely supported. */
export function hasAbsoluteOrientationListener(): boolean {
  if (typeof window === "undefined") return false;
  return "ondeviceorientationabsolute" in window;
}
