import { FloorPlan } from "./dxfGenerator";

// A ready-made 3-bedroom apartment (12m × 9m) so the app can be explored
// with no API key — powers the "Try a sample plan" button.
export const SAMPLE_FLOOR_PLAN: FloorPlan = {
  totalWidth: 12,
  totalHeight: 9,
  scale: 1000,
  rooms: [
    {
      name: "Living Room",
      x: 0,
      y: 0,
      width: 6,
      height: 5,
      doors: [
        { wall: "bottom", position: 2.5 },
        { wall: "right", position: 2 },
      ],
      windows: [{ wall: "bottom", position: 4.5 }],
    },
    {
      name: "Kitchen",
      x: 6,
      y: 0,
      width: 3,
      height: 5,
      doors: [{ wall: "left", position: 2 }],
      windows: [{ wall: "bottom", position: 1 }],
    },
    {
      name: "Bathroom",
      x: 9,
      y: 0,
      width: 3,
      height: 2.5,
      doors: [{ wall: "top", position: 1 }],
    },
    {
      name: "WC / Utility",
      x: 9,
      y: 2.5,
      width: 3,
      height: 2.5,
      doors: [{ wall: "left", position: 1 }],
    },
    {
      name: "Bedroom 1",
      x: 0,
      y: 5,
      width: 4,
      height: 4,
      doors: [{ wall: "bottom", position: 1.5 }],
      windows: [{ wall: "top", position: 1.5 }],
    },
    {
      name: "Bedroom 2",
      x: 4,
      y: 5,
      width: 4,
      height: 4,
      doors: [{ wall: "bottom", position: 1.5 }],
      windows: [{ wall: "top", position: 1.5 }],
    },
    {
      name: "Master Bedroom",
      x: 8,
      y: 5,
      width: 4,
      height: 4,
      doors: [{ wall: "bottom", position: 1.5 }],
      windows: [{ wall: "top", position: 2 }],
    },
  ],
};
