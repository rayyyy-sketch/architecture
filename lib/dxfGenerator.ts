export interface Room {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  doors?: { wall: "top" | "bottom" | "left" | "right"; position: number }[];
  windows?: { wall: "top" | "bottom" | "left" | "right"; position: number }[];
}

export interface FloorPlan {
  rooms: Room[];
  totalWidth: number;
  totalHeight: number;
  scale: number; // mm per unit
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
    const x1 = room.x * s;
    const y1 = room.y * s;
    const x2 = (room.x + room.width) * s;
    const y2 = (room.y + room.height) * s;

    // Four walls as LINE entities
    const wallSegs: [number, number, number, number][] = [
      [x1, y1, x2, y1], // bottom
      [x2, y1, x2, y2], // right
      [x2, y2, x1, y2], // top
      [x1, y2, x1, y1], // left
    ];

    for (const [ax, ay, bx, by] of wallSegs) {
      push("0", "LINE", "8", "WALLS", "10", ax, "20", ay, "30", "0", "11", bx, "21", by, "31", "0");
    }

    // Room label (TEXT entity)
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;
    push("0", "TEXT", "8", "LABELS", "10", cx, "20", cy, "30", "0", "40", s * 0.4, "1", room.name, "72", "1", "11", cx, "21", cy, "31", "0");

    // Doors
    if (room.doors) {
      for (const door of room.doors) {
        const doorWidth = s * 0.9;
        let dx1: number, dy1: number, dx2: number, dy2: number;
        const p = door.position * s;
        if (door.wall === "bottom") { dx1 = x1 + p; dy1 = y1; dx2 = x1 + p + doorWidth; dy2 = y1; }
        else if (door.wall === "top") { dx1 = x1 + p; dy1 = y2; dx2 = x1 + p + doorWidth; dy2 = y2; }
        else if (door.wall === "left") { dx1 = x1; dy1 = y1 + p; dx2 = x1; dy2 = y1 + p + doorWidth; }
        else { dx1 = x2; dy1 = y1 + p; dx2 = x2; dy2 = y1 + p + doorWidth; }
        // Draw door gap (erase wall) with a white line trick — use OPENINGS layer color 1
        push("0", "LINE", "8", "OPENINGS", "10", dx1, "20", dy1, "30", "0", "11", dx2, "21", dy2, "31", "0");
      }
    }
  }

  push("0", "ENDSEC");
  push("0", "EOF");

  return lines.join("\n");
}
