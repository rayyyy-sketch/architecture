import { ARCHITECT_STYLES } from "./architectStyles";

// Haiku 4.5 — the cheapest Claude model ($1/$5 per 1M tokens), ~3x cheaper
// than Sonnet. Still supports vision (photo redraw) and web search.
export const GEN_MODEL = "claude-haiku-4-5";
export const GEN_MAX_TOKENS = 8000;

export const CREATIVITY_DIRECTIVE: Record<string, string> = {
  subtle:
    "CREATIVITY: SUBTLE. Keep footprints mostly orthogonal and rational. Clean rectangles, efficient circulation. At most one gently angled accent.",
  balanced:
    "CREATIVITY: BALANCED. Mix rectangular rooms with a few L-shaped, angled or splayed footprints. Introduce one spatial 'move' (a diagonal axis, a courtyard, a double-height void).",
  bold:
    "CREATIVITY: BOLD. Reject the boring box. Embrace non-orthogonal geometry: angled walls, splayed and faceted rooms, sweeping curved footprints (approximate curves with many polygon points), courtyards, diagonal circulation spines. Be daring and sculptural while keeping the plan livable and buildable.",
};

const SCHEMA = `Return ONLY valid JSON (no markdown fences, no prose) in EXACTLY this shape:
{
  "variations": [
    {
      "conceptName": "Short evocative name for this concept",
      "conceptDescription": "1-2 sentences on the spatial idea / parti behind it",
      "scale": 1000,
      "totalWidth": 16,
      "totalHeight": 12,
      "rooms": [
        {
          "name": "Living Room",
          "x": 0, "y": 0, "width": 6, "height": 5,
          "polygon": [{"x":0,"y":0},{"x":6,"y":0},{"x":6,"y":3},{"x":4,"y":5},{"x":0,"y":5}]
        }
      ]
    }
  ]
}

RULES:
- Produce EXACTLY 3 variations, each a genuinely different spatial concept (not minor tweaks).
- Units are meters. The origin (0,0) is bottom-left; y increases upward.
- ALWAYS include x, y, width, height as the room's axis-aligned bounding box.
- "polygon" is OPTIONAL: an ordered list of 3+ {x,y} vertices for the room's true footprint
  (use it for angled / L-shaped / faceted / curved rooms — approximate curves with many points).
  Omit "polygon" for plain rectangular rooms.
- Rooms within a variation must tile together without overlapping; shared walls should align.
- Keep every room a sensible, usable size.
- Your FINAL message must be ONLY the JSON object — nothing else.`;

const ELEVATION_SCHEMA = `Return ONLY valid JSON (no markdown fences, no prose) in EXACTLY this shape:
{
  "variations": [
    {
      "conceptName": "Short evocative name for this facade",
      "conceptDescription": "1-2 sentences on the exterior idea (materials, rhythm, massing)",
      "scale": 1000,
      "width": 14,
      "height": 10,
      "lines": [
        { "layer": "OUTLINE", "closed": true, "points": [{"x":0,"y":0},{"x":14,"y":0},{"x":14,"y":8},{"x":0,"y":8}] },
        { "layer": "ROOF", "points": [{"x":-0.5,"y":8},{"x":7,"y":10},{"x":14.5,"y":8}] },
        { "layer": "WINDOWS", "closed": true, "points": [{"x":2,"y":2},{"x":4,"y":2},{"x":4,"y":4},{"x":2,"y":4}] },
        { "layer": "DOORS", "closed": true, "points": [{"x":6,"y":0},{"x":8,"y":0},{"x":8,"y":3},{"x":6,"y":3}] }
      ]
    }
  ]
}

RULES:
- This is a FRONT ELEVATION (exterior facade), seen straight on. x = horizontal, y = height. Origin (0,0) is ground level at the left; y increases UPWARD.
- Produce EXACTLY 3 variations, each a genuinely different facade concept.
- Every "lines" entry is a polyline with a "layer" of: OUTLINE (the building silhouette), ROOF, WINDOWS, DOORS, or DETAIL (balconies, cornices, mullions, cladding lines).
- Use "closed": true for shapes that close (window/door rectangles, the outline). Approximate curves/arches with many points.
- Include a clear OUTLINE, a ROOF, several WINDOWS in a considered rhythm, at least one DOOR, and some DETAIL lines.
- Keep proportions realistic (storey ≈ 3m). "width"/"height" are the overall facade extents in meters.
- Your FINAL message must be ONLY the JSON object — nothing else.`;

export function resolveStyle(styleId: string, customStyle: string) {
  const custom = (customStyle || "").trim();
  if (custom.length > 0) {
    return {
      useResearch: true,
      styleName: custom,
      styleDirective: `RESEARCH-DRIVEN STYLE. The user wants the design in the style of: "${custom}".
First research this architect / movement / style — its spatial principles, proportions, signature
geometric moves, circulation and use of light — then apply those principles faithfully to the plans.
If you used web search, ground the design in what you found.`,
    };
  }
  const preset = ARCHITECT_STYLES.find((s) => s.id === styleId) ?? ARCHITECT_STYLES[ARCHITECT_STYLES.length - 1];
  return { useResearch: false, styleName: preset.name, styleDirective: preset.systemPrompt };
}

export type GenMode = "plan" | "exterior";

export function buildSystemPrompt(styleDirective: string, creativity: string, mode: GenMode = "plan"): string {
  const creativityDirective = CREATIVITY_DIRECTIVE[creativity] ?? CREATIVITY_DIRECTIVE.balanced;
  const intro =
    mode === "exterior"
      ? "You are a visionary architect designing building EXTERIORS (front elevations / facades)."
      : "You are a visionary architect generating buildable floor plans.";
  return `${intro}

Work like a real designer: FIRST think about the defining idea (massing, materials, rhythm for a
facade; zoning and circulation for a plan) — THEN translate it into geometry. Avoid boring boxes.

${styleDirective}

${creativityDirective}

${mode === "exterior" ? ELEVATION_SCHEMA : SCHEMA}`;
}

export function buildInstruction(description: string, hasImage: boolean, mode: GenMode = "plan"): string {
  if (mode === "exterior") {
    if (hasImage) {
      let t =
        "The user uploaded a photo/sketch of a building. Read it and REDRAW it as 3 front-elevation (facade) concepts as line geometry — faithful to its proportions, but refined.";
      if (description) t += `\nApply these notes: ${description}`;
      return t;
    }
    return `Design 3 distinct exterior front-elevation (facade) concepts for: ${description}`;
  }
  if (hasImage) {
    let t =
      "The user uploaded a photo/sketch of a floor plan or space. Read it carefully and REDRAW it into 3 editable floor-plan concepts — faithfully reproducing its layout and proportions where sensible, while refining and improving it.";
    if (description) t += `\nApply these edits / notes from the user: ${description}`;
    return t;
  }
  return `Design 3 distinct floor plan concepts for: ${description}`;
}

// Pull the JSON object out of the model's reply and return the variations array.
export function parseVariations(text: string): Record<string, unknown>[] {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not find a design in the AI response.");
  const parsed = JSON.parse(jsonMatch[0]);
  return Array.isArray(parsed.variations) ? parsed.variations : [parsed];
}
