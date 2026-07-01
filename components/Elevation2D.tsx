"use client";

import { useEffect, useRef } from "react";
import { Elevation } from "@/lib/elevation";

const LAYER_STROKE: Record<string, string> = {
  OUTLINE: "#e7e5e4",
  WINDOWS: "#60a5fa",
  DOORS: "#34d399",
  ROOF: "#f59e0b",
  DETAIL: "#78716c",
};

export default function Elevation2D({ elevation }: { elevation: Elevation }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const padding = 56;
    const availW = canvas.width - padding * 2;
    const availH = canvas.height - padding * 2;
    const scale = Math.min(availW / elevation.width, availH / elevation.height);

    const offsetX = padding + (availW - elevation.width * scale) / 2;
    const offsetY = padding + (availH - elevation.height * scale) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ground line
    const groundY = offsetY + elevation.height * scale;
    ctx.strokeStyle = "#44403c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(offsetX - 30, groundY);
    ctx.lineTo(offsetX + elevation.width * scale + 30, groundY);
    ctx.stroke();

    const tx = (x: number) => offsetX + x * scale;
    const ty = (y: number) => offsetY + (elevation.height - y) * scale; // flip y (up)

    for (const line of elevation.lines) {
      if (!line.points || line.points.length < 2) continue;
      ctx.strokeStyle = LAYER_STROKE[line.layer] ?? LAYER_STROKE.DETAIL;
      ctx.lineWidth = line.layer === "OUTLINE" || line.layer === "ROOF" ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(tx(line.points[0].x), ty(line.points[0].y));
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(tx(line.points[i].x), ty(line.points[i].y));
      }
      if (line.closed) ctx.closePath();
      ctx.stroke();
    }

    // Scale bar
    const barMeters = Math.max(1, Math.round(elevation.width / 4));
    const barPx = barMeters * scale;
    const bx = offsetX;
    const by = canvas.height - 20;
    ctx.strokeStyle = "#78716c";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + barPx, by); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx + barPx, by - 4); ctx.lineTo(bx + barPx, by + 4); ctx.stroke();
    ctx.fillStyle = "#78716c";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${barMeters}m`, bx + barPx / 2, by - 8);
  }, [elevation]);

  return (
    <canvas ref={canvasRef} width={800} height={600} className="w-full h-full" style={{ display: "block" }} />
  );
}
