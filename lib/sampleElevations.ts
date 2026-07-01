import { ElevationVariation } from "./elevation";

// Ready-made facade concepts so Exterior mode can be explored with no API key.
export const SAMPLE_ELEVATIONS: ElevationVariation[] = [
  {
    conceptName: "Gabled Modern",
    conceptDescription:
      "A crisp two-storey volume with a pitched roof, a tall entry, and a rhythmic band of windows.",
    scale: 1000,
    width: 12,
    height: 9,
    lines: [
      { layer: "OUTLINE", closed: true, points: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 6.5 }, { x: 0, y: 6.5 }] },
      { layer: "ROOF", points: [{ x: -0.6, y: 6.5 }, { x: 6, y: 9 }, { x: 12.6, y: 6.5 }] },
      { layer: "DOORS", closed: true, points: [{ x: 5, y: 0 }, { x: 7, y: 0 }, { x: 7, y: 3 }, { x: 5, y: 3 }] },
      { layer: "WINDOWS", closed: true, points: [{ x: 1.2, y: 1 }, { x: 3.2, y: 1 }, { x: 3.2, y: 3 }, { x: 1.2, y: 3 }] },
      { layer: "WINDOWS", closed: true, points: [{ x: 8.8, y: 1 }, { x: 10.8, y: 1 }, { x: 10.8, y: 3 }, { x: 8.8, y: 3 }] },
      { layer: "WINDOWS", closed: true, points: [{ x: 1.2, y: 4 }, { x: 3.2, y: 4 }, { x: 3.2, y: 5.8 }, { x: 1.2, y: 5.8 }] },
      { layer: "WINDOWS", closed: true, points: [{ x: 5, y: 4 }, { x: 7, y: 4 }, { x: 7, y: 5.8 }, { x: 5, y: 5.8 }] },
      { layer: "WINDOWS", closed: true, points: [{ x: 8.8, y: 4 }, { x: 10.8, y: 4 }, { x: 10.8, y: 5.8 }, { x: 8.8, y: 5.8 }] },
      { layer: "DETAIL", points: [{ x: 0, y: 3.5 }, { x: 12, y: 3.5 }] },
    ],
  },
  {
    conceptName: "Flat-Roof Minimal",
    conceptDescription:
      "A calm rectilinear box with a flat roof, an asymmetric window composition, and a recessed entry.",
    scale: 1000,
    width: 13,
    height: 7,
    lines: [
      { layer: "OUTLINE", closed: true, points: [{ x: 0, y: 0 }, { x: 13, y: 0 }, { x: 13, y: 6.5 }, { x: 0, y: 6.5 }] },
      { layer: "ROOF", points: [{ x: -0.4, y: 6.5 }, { x: 13.4, y: 6.5 }] },
      { layer: "DOORS", closed: true, points: [{ x: 1, y: 0 }, { x: 2.6, y: 0 }, { x: 2.6, y: 2.6 }, { x: 1, y: 2.6 }] },
      { layer: "WINDOWS", closed: true, points: [{ x: 4, y: 1 }, { x: 8, y: 1 }, { x: 8, y: 3 }, { x: 4, y: 3 }] },
      { layer: "WINDOWS", closed: true, points: [{ x: 9.5, y: 1 }, { x: 12, y: 1 }, { x: 12, y: 5.5 }, { x: 9.5, y: 5.5 }] },
      { layer: "WINDOWS", closed: true, points: [{ x: 1, y: 3.8 }, { x: 8, y: 3.8 }, { x: 8, y: 5.5 }, { x: 1, y: 5.5 }] },
    ],
  },
  {
    conceptName: "Arched Classic",
    conceptDescription:
      "A symmetrical facade with arched openings, a central portico, and a low hipped roof.",
    scale: 1000,
    width: 14,
    height: 9,
    lines: [
      { layer: "OUTLINE", closed: true, points: [{ x: 0, y: 0 }, { x: 14, y: 0 }, { x: 14, y: 7 }, { x: 0, y: 7 }] },
      { layer: "ROOF", points: [{ x: -0.5, y: 7 }, { x: 3, y: 8.6 }, { x: 11, y: 8.6 }, { x: 14.5, y: 7 }] },
      { layer: "DOORS", points: [{ x: 6, y: 0 }, { x: 6, y: 3 }, { x: 6.5, y: 3.6 }, { x: 7, y: 3.8 }, { x: 7.5, y: 3.6 }, { x: 8, y: 3 }, { x: 8, y: 0 }] },
      { layer: "WINDOWS", points: [{ x: 1.5, y: 1 }, { x: 1.5, y: 3.5 }, { x: 2.25, y: 4.2 }, { x: 3, y: 3.5 }, { x: 3, y: 1 }, { x: 1.5, y: 1 }] },
      { layer: "WINDOWS", points: [{ x: 11, y: 1 }, { x: 11, y: 3.5 }, { x: 11.75, y: 4.2 }, { x: 12.5, y: 3.5 }, { x: 12.5, y: 1 }, { x: 11, y: 1 }] },
      { layer: "DETAIL", points: [{ x: 0, y: 4.5 }, { x: 14, y: 4.5 }] },
      { layer: "DETAIL", points: [{ x: 5.5, y: 4 }, { x: 8.5, y: 4 }] },
    ],
  },
];
