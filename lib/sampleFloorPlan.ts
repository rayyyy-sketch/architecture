import { Variation } from "./dxfGenerator";

// Ready-made concepts so the app can be explored with no API key — powers the
// "Try a sample plan" button. Shows off the new free-form geometry.
export const SAMPLE_VARIATIONS: Variation[] = [
  {
    conceptName: "The Pinwheel",
    conceptDescription:
      "Rooms rotate around a central core, each splayed to capture a different view and break the boxy grid.",
    scale: 1000,
    totalWidth: 14,
    totalHeight: 12,
    rooms: [
      {
        name: "Living Room",
        x: 0, y: 0, width: 8, height: 6,
        polygon: [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 4 }, { x: 5, y: 6 }, { x: 0, y: 6 }],
      },
      {
        name: "Kitchen",
        x: 8, y: 0, width: 6, height: 4,
        polygon: [{ x: 8, y: 0 }, { x: 14, y: 0 }, { x: 14, y: 4 }, { x: 8, y: 4 }],
      },
      {
        name: "Core / Stair",
        x: 5, y: 4, width: 3, height: 3,
        polygon: [{ x: 8, y: 4 }, { x: 11, y: 4 }, { x: 11, y: 7 }, { x: 8, y: 7 }],
      },
      {
        name: "Master Bedroom",
        x: 0, y: 6, width: 7, height: 6,
        polygon: [{ x: 0, y: 6 }, { x: 5, y: 6 }, { x: 8, y: 7 }, { x: 7, y: 12 }, { x: 0, y: 12 }],
      },
      {
        name: "Study",
        x: 11, y: 4, width: 3, height: 8,
        polygon: [{ x: 11, y: 4 }, { x: 14, y: 4 }, { x: 14, y: 12 }, { x: 11, y: 7 }],
      },
      {
        name: "Bedroom 2",
        x: 7, y: 7, width: 4, height: 5,
        polygon: [{ x: 7, y: 12 }, { x: 8, y: 7 }, { x: 11, y: 7 }, { x: 11, y: 12 }],
      },
    ],
  },
  {
    conceptName: "The Courtyard",
    conceptDescription:
      "An L-shaped living wing wraps a private courtyard, with bedrooms lined along a quiet rear spine.",
    scale: 1000,
    totalWidth: 14,
    totalHeight: 11,
    rooms: [
      {
        name: "Living + Dining",
        x: 0, y: 0, width: 9, height: 5,
        polygon: [{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 9, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 3 }, { x: 0, y: 3 }],
      },
      { name: "Kitchen", x: 0, y: 3, width: 5, height: 4, polygon: [{ x: 0, y: 3 }, { x: 5, y: 3 }, { x: 5, y: 7 }, { x: 0, y: 7 }] },
      { name: "Courtyard", x: 5, y: 5, width: 4, height: 2, polygon: [{ x: 5, y: 5 }, { x: 9, y: 5 }, { x: 9, y: 7 }, { x: 5, y: 7 }] },
      { name: "Master Bedroom", x: 9, y: 0, width: 5, height: 5 },
      { name: "Bedroom 2", x: 0, y: 7, width: 5, height: 4 },
      { name: "Bedroom 3", x: 5, y: 7, width: 5, height: 4 },
      { name: "Bath", x: 10, y: 5, width: 4, height: 6 },
    ],
  },
  {
    conceptName: "The Rectilinear",
    conceptDescription:
      "A calm, efficient orthogonal plan — the rational baseline, with doors and clean circulation.",
    scale: 1000,
    totalWidth: 12,
    totalHeight: 9,
    rooms: [
      { name: "Living Room", x: 0, y: 0, width: 6, height: 5, doors: [{ wall: "right", position: 2 }] },
      { name: "Kitchen", x: 6, y: 0, width: 3, height: 5, doors: [{ wall: "left", position: 2 }] },
      { name: "Bathroom", x: 9, y: 0, width: 3, height: 2.5 },
      { name: "WC / Utility", x: 9, y: 2.5, width: 3, height: 2.5 },
      { name: "Bedroom 1", x: 0, y: 5, width: 4, height: 4, doors: [{ wall: "bottom", position: 1.5 }] },
      { name: "Bedroom 2", x: 4, y: 5, width: 4, height: 4, doors: [{ wall: "bottom", position: 1.5 }] },
      { name: "Master Bedroom", x: 8, y: 5, width: 4, height: 4, doors: [{ wall: "bottom", position: 1.5 }] },
    ],
  },
];
