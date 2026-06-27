import { Room, Point } from "./dxfGenerator";

// Returns a room's footprint as an ordered list of vertices (meters, y-up).
// Uses the free-form polygon when present, otherwise the rectangle.
export function roomPolygon(room: Room): Point[] {
  if (room.polygon && room.polygon.length >= 3) return room.polygon;
  return [
    { x: room.x, y: room.y },
    { x: room.x + room.width, y: room.y },
    { x: room.x + room.width, y: room.y + room.height },
    { x: room.x, y: room.y + room.height },
  ];
}

// Area-weighted centroid of a polygon (good for label placement).
export function centroid(pts: Point[]): Point {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-9) {
    const ax = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const ay = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return { x: ax, y: ay };
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

export function polygonArea(pts: Point[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}
