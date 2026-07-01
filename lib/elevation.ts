import { Point } from "./dxfGenerator";

// A single polyline in an elevation (front view), grouped on a CAD layer.
export interface ElevationLine {
  layer: "OUTLINE" | "WINDOWS" | "DOORS" | "ROOF" | "DETAIL";
  closed?: boolean;
  points: Point[];
}

export interface Elevation {
  width: number; // building width in meters
  height: number; // building height in meters
  scale: number; // mm per unit
  lines: ElevationLine[];
}

export interface ElevationVariation extends Elevation {
  conceptName?: string;
  conceptDescription?: string;
}

const LAYER_COLOR: Record<string, number> = {
  OUTLINE: 7, // white
  WINDOWS: 5, // blue
  DOORS: 3, // green
  ROOF: 1, // red
  DETAIL: 8, // grey
};

export function generateElevationDXF(el: Elevation): string {
  const s = el.scale;
  const lines: string[] = [];
  const push = (...args: (string | number)[]) => {
    for (const a of args) lines.push(String(a));
  };

  push("0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1015", "0", "ENDSEC");

  // Layers
  push("0", "SECTION", "2", "TABLES", "0", "TABLE", "2", "LAYER", "70", String(Object.keys(LAYER_COLOR).length));
  for (const [name, color] of Object.entries(LAYER_COLOR)) {
    push("0", "LAYER", "2", name, "70", "0", "62", color, "6", "CONTINUOUS");
  }
  push("0", "ENDTAB", "0", "ENDSEC");

  // Entities
  push("0", "SECTION", "2", "ENTITIES");
  for (const line of el.lines) {
    if (!line.points || line.points.length < 2) continue;
    const layer = LAYER_COLOR[line.layer] !== undefined ? line.layer : "DETAIL";
    push("0", "LWPOLYLINE", "8", layer, "90", line.points.length, "70", line.closed ? 1 : 0);
    for (const p of line.points) {
      push("10", p.x * s, "20", p.y * s);
    }
  }
  push("0", "ENDSEC", "0", "EOF");

  return lines.join("\n");
}
