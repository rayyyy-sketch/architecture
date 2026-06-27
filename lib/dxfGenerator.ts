import { roomPolygon, centroid } from "./geometry";

export interface Point {
  x: number;
  y: number;
}

export interface Room {
  name: string;
  // Simple rectangle footprint (always present as a fallback / bounding box).
  x: number;
  y: number;
  width: number;
  height: number;
  // Optional free-form footprint (meters, y-up). When given (3+ points) it
  // overrides the rectangle and lets rooms be angled, L-shaped, faceted, etc.
  polygon?: Point[];
  doors?: { wall: "top" | "bottom" | "left" | "right"; position: number }[];
  windows?: { wall: "top" | "bottom" | "left" | "right"; position: number }[];
}

export interface FloorPlan {
  rooms: Room[];
  totalWidth: number;
  totalHeight: number;
  scale: number; // mm per unit
}

// A FloorPlan plus the design concept behind it (one of the 3 variations).
export interface Variation extends FloorPlan {
  conceptName?: string;
  conceptDescription?: string;
}

export function generateDXF(plan: FloorPlan): string {
  const s = plan.scale;
  const lines: string[] = [];

  const push = (...args: (string | number)[]) => {
    for (const a of args) lines.push(String(a));
  };

  // DXF header
  push("0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1015", "0", "ENDSEC");

  // Tables section (layers)
  push("0", "SECTION", "2", "TABLES");
  push("0", "TABLE", "2", "LAYER", "70", "3");

  const addLayer = (name: string, color: number) => {
    push("0", "LAYER", "2", name, "70", "0", "62", color, "6", "CONTINUOUS");
  };
  addLayer("WALLS", 7);
  addLayer("LABELS", 3);
  addLayer("OPENINGS", 1);
  push("0", "ENDTAB");
  push("0", "ENDSEC");

  // Entities
  push("0", "SECTION", "2", "ENTITIES");

  for (const room of plan.rooms) {
    const poly = roomPolygon(room);

    // Footprint as a closed lightweight polyline (handles any shape).
    push("0", "LWPOLYLINE", "8", "WALLS", "90", poly.length, "70", "1");
    for (const p of poly) {
      push("10", p.x * s, "20", p.y * s);
    }

    // Room label at the centroid.
    const c = centroid(poly);
    push(
      "0", "TEXT", "8", "LABELS",
      "10", c.x * s, "20", c.y * s, "30", "0",
      "40", s * 0.4, "1", room.name,
      "72", "1", "11", c.x * s, "21", c.y * s, "31", "0"
    );

    // Doors (only meaningful for the simple rectangle footprint).
    if (!room.polygon && room.doors) {
      const x1 = room.x * s;
      const y1 = room.y * s;
      const x2 = (room.x + room.width) * s;
      const y2 = (room.y + room.height) * s;
      for (const door of room.doors) {
        const doorWidth = s * 0.9;
        const p = door.position * s;
        let dx1: number, dy1: number, dx2: number, dy2: number;
        if (door.wall === "bottom") { dx1 = x1 + p; dy1 = y1; dx2 = x1 + p + doorWidth; dy2 = y1; }
        else if (door.wall === "top") { dx1 = x1 + p; dy1 = y2; dx2 = x1 + p + doorWidth; dy2 = y2; }
        else if (door.wall === "left") { dx1 = x1; dy1 = y1 + p; dx2 = x1; dy2 = y1 + p + doorWidth; }
        else { dx1 = x2; dy1 = y1 + p; dx2 = x2; dy2 = y1 + p + doorWidth; }
        push("0", "LINE", "8", "OPENINGS", "10", dx1, "20", dy1, "30", "0", "11", dx2, "21", dy2, "31", "0");
      }
    }
  }

  push("0", "ENDSEC");
  push("0", "EOF");

  return lines.join("\n");
}
