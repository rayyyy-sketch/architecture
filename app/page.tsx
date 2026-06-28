"use client";

import { useState, useRef, useCallback } from "react";
import { ARCHITECT_STYLES } from "@/lib/architectStyles";
import { Variation } from "@/lib/dxfGenerator";
import { SAMPLE_VARIATIONS } from "@/lib/sampleFloorPlan";
import FloorPlan2D from "@/components/FloorPlan2D";
import FloorPlan3D from "@/components/FloorPlan3D";

type ViewMode = "2d" | "3d";
type Creativity = "subtle" | "balanced" | "bold";

const CREATIVITY_LEVELS: { id: Creativity; label: string; hint: string }[] = [
  { id: "subtle", label: "Subtle", hint: "Clean & orthogonal" },
  { id: "balanced", label: "Balanced", hint: "A few bold moves" },
  { id: "bold", label: "Bold", hint: "Sculptural & daring" },
];

export default function Home() {
  const [description, setDescription] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(ARCHITECT_STYLES[0].id);
  const [customStyle, setCustomStyle] = useState("");
  const [creativity, setCreativity] = useState<Creativity>("balanced");
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [styleName, setStyleName] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const current = variations[selectedIndex] ?? null;

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleGenerate = async () => {
    if (!description && !imageFile) {
      setError("Please enter a description or upload a reference image.");
      return;
    }
    setError("");
    setLoading(true);
    setVariations([]);
    setSelectedIndex(0);

    try {
      const formData = new FormData();
      formData.append("description", description);
      formData.append("styleId", selectedStyle);
      formData.append("customStyle", customStyle);
      formData.append("creativity", creativity);
      if (imageFile) formData.append("image", imageFile);

      const res = await fetch("/api/generate", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Generation failed");
      setVariations(data.variations ?? []);
      setStyleName(data.styleName);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSample = () => {
    setError("");
    setSelectedIndex(0);
    setVariations(SAMPLE_VARIATIONS);
    setStyleName("Sample concepts");
  };

  const handleExportDXF = async () => {
    if (!current) return;
    const { generateDXF } = await import("@/lib/dxfGenerator");
    const dxfContent = generateDXF(current);
    const blob = new Blob([dxfContent], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(current.conceptName || "floor-plan").replace(/\s+/g, "-").toLowerCase()}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedStyleData = ARCHITECT_STYLES.find((s) => s.id === selectedStyle);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 font-sans">
      {/* Header */}
      <header className="border-b border-stone-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-500 rounded-sm flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-stone-950">
            <polygon points="3 9 12 2 21 9 21 22 3 22" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">ArchAI</h1>
          <p className="text-xs text-stone-400">AI Floor Plan Generator → AutoCAD</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8">
        {/* Left Panel — Controls */}
        <div className="space-y-6">
          {/* Description */}
          <section>
            <label className="block text-sm font-medium text-stone-300 mb-2">Project Description</label>
            <textarea
              className="w-full h-32 bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none transition-colors"
              placeholder='e.g. "3-bedroom apartment, 120m², open kitchen with island, 2 bathrooms, large living room with terrace access"'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </section>

          {/* Image Upload — drop a photo and the AI redraws / edits it */}
          <section>
            <label className="block text-sm font-medium text-stone-300 mb-2">
              Photo to redraw &amp; edit <span className="text-stone-500 font-normal">(optional)</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragging ? "border-amber-500 bg-amber-500/10" : "border-stone-700 hover:border-stone-500"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleImageDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Reference" className="max-h-32 mx-auto rounded object-contain" />
                  <button
                    className="absolute top-0 right-0 bg-stone-800 rounded-full p-1 text-stone-400 hover:text-red-400"
                    onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="text-stone-500 text-sm">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Slide a photo or sketch here — the AI redraws &amp; edits it into a plan
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            </div>
          </section>

          {/* Creativity dial */}
          <section>
            <label className="block text-sm font-medium text-stone-300 mb-2">Creativity</label>
            <div className="flex bg-stone-900 border border-stone-700 rounded-lg p-1 gap-1">
              {CREATIVITY_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setCreativity(lvl.id)}
                  className={`flex-1 px-2 py-2 rounded text-center transition-colors ${
                    creativity === lvl.id ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <div className="text-xs font-semibold">{lvl.label}</div>
                  <div className={`text-[9px] ${creativity === lvl.id ? "text-stone-800" : "text-stone-500"}`}>{lvl.hint}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Architect Style Selection */}
          <section>
            <label className="block text-sm font-medium text-stone-300 mb-3">Architect Style</label>
            <div className="grid grid-cols-2 gap-2">
              {ARCHITECT_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                    selectedStyle === style.id
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-300"
                  }`}
                >
                  <div className="font-semibold truncate">{style.shortName}</div>
                  <div className="text-stone-500 mt-0.5 text-[10px] leading-tight line-clamp-2">{style.description.split(",")[0]}</div>
                </button>
              ))}
            </div>

            {selectedStyleData && (
              <div className="mt-3 bg-stone-900 border border-stone-800 rounded-lg p-3">
                <div className="text-amber-400 text-xs font-semibold">{selectedStyleData.name}</div>
                {selectedStyleData.period && <div className="text-stone-500 text-[10px]">{selectedStyleData.period}</div>}
                <div className="text-stone-400 text-xs mt-1 leading-relaxed">{selectedStyleData.description}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedStyleData.keywords.slice(0, 4).map((k) => (
                    <span key={k} className="bg-stone-800 text-stone-400 text-[9px] px-1.5 py-0.5 rounded">{k}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Research any style the presets don't cover */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-stone-400 mb-1.5">
                Or research a specific style / architect
              </label>
              <input
                type="text"
                value={customStyle}
                onChange={(e) => setCustomStyle(e.target.value)}
                placeholder='e.g. "Santiago Calatrava", "Brutalism", "Japanese minimalism"'
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {customStyle.trim() && (
                <p className="text-[11px] text-amber-400/80 mt-1.5 leading-snug">
                  The AI will research <span className="font-semibold">{customStyle.trim()}</span> and design in that style (overrides the preset above).
                </p>
              )}
            </div>
          </section>

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                Designing 3 concepts...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Generate 3 Concepts
              </>
            )}
          </button>

          {/* Sample — works with no API key */}
          <button
            onClick={handleSample}
            disabled={loading}
            className="w-full -mt-2 text-stone-400 hover:text-amber-400 text-xs font-medium py-1 transition-colors disabled:opacity-50"
          >
            or try sample concepts (no API key needed) →
          </button>
        </div>

        {/* Right Panel — Preview */}
        <div className="space-y-4">
          {/* Variation switcher */}
          {variations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {variations.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={`text-left px-3 py-2 rounded-lg border transition-all ${
                    selectedIndex === i
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-stone-700 hover:border-stone-500"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold ${selectedIndex === i ? "text-amber-400" : "text-stone-500"}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className={`text-xs font-semibold truncate ${selectedIndex === i ? "text-amber-400" : "text-stone-300"}`}>
                      {v.conceptName || `Concept ${i + 1}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* View Mode Toggle + style */}
          {current && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-stone-400 text-sm">Style: </span>
                <span className="text-amber-400 text-sm font-medium">{styleName}</span>
              </div>
              <div className="flex bg-stone-900 border border-stone-700 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setViewMode("2d")}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                    viewMode === "2d" ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  2D Plan
                </button>
                <button
                  onClick={() => setViewMode("3d")}
                  className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                    viewMode === "3d" ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  3D View
                </button>
              </div>
            </div>
          )}

          {/* Concept description */}
          {current?.conceptDescription && (
            <p className="text-stone-400 text-sm bg-stone-900 border border-stone-800 rounded-lg px-4 py-3 leading-relaxed">
              <span className="text-amber-400 font-medium">{current.conceptName}: </span>
              {current.conceptDescription}
            </p>
          )}

          {/* Canvas Area */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden" style={{ minHeight: 500 }}>
            {!current && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-stone-600 py-32">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4">
                  <rect x="2" y="3" width="20" height="18" rx="1" />
                  <line x1="2" y1="9" x2="22" y2="9" />
                  <line x1="12" y1="9" x2="12" y2="21" />
                  <line x1="7" y1="3" x2="7" y2="9" />
                </svg>
                <p className="text-sm">Your concepts will appear here</p>
                <p className="text-xs mt-1">Describe a project, set the creativity, and generate</p>
              </div>
            )}
            {loading && (
              <div className="flex flex-col items-center justify-center h-full py-32">
                <div className="w-12 h-12 border-2 border-stone-700 border-t-amber-500 rounded-full animate-spin mb-4" />
                <p className="text-stone-400 text-sm">AI is exploring 3 directions...</p>
                <p className="text-stone-600 text-xs mt-1">Applying {selectedStyleData?.name} · {creativity} creativity</p>
              </div>
            )}
            {current && !loading && (
              viewMode === "2d" ? (
                <FloorPlan2D plan={current} />
              ) : (
                <FloorPlan3D plan={current} />
              )
            )}
          </div>

          {/* Export Button */}
          {current && (
            <button
              onClick={handleExportDXF}
              className="w-full border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-stone-950 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export this concept to AutoCAD (.dxf)
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
