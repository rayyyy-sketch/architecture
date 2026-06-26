"use client";

import { useEffect, useRef } from "react";
import { FloorPlan } from "@/lib/dxfGenerator";

const COLORS = [
  "#78716c", "#a8a29e", "#57534e", "#d6d3d1", "#79716b",
  "#a1a1aa", "#6b7280", "#9ca3af", "#71717a", "#8b8689",
];

export default function FloorPlan2D({ plan }: { plan: FloorPlan }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const padding = 48;
    const availW = canvas.width - padding * 2;
    const availH = canvas.height - padding * 2;
    const scaleX = availW / plan.totalWidth;
    const scaleY = availH / plan.totalHeight;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = padding + (availW - plan.totalWidth * scale) / 2;
    const offsetY = padding + (availH - plan.totalHeight * scale) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background grid
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 0.5;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    plan.rooms.forEach((room, i) => {
      const x = offsetX + room.x * scale;
      const y = offsetY + (plan.totalHeight - room.y - room.height) * scale;
      const w = room.width * scale;
      const h = room.height * scale;

      // Room fill
      ctx.fillStyle = COLORS[i % COLORS.length] + "22";
      ctx.fillRect(x, y, w, h);

      // Walls
      ctx.strokeStyle = "#e7e5e4";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x, y, w, h);

      // Doors
      if (room.doors) {
        for (const door of room.doors) {
          const doorW = 0.9 * scale;
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);
          if (door.wall === "bottom") {
            const dx = x + door.position * scale;
            ctx.beginPath(); ctx.moveTo(dx, y + h); ctx.lineTo(dx + doorW, y + h); ctx.stroke();
            ctx.beginPath(); ctx.arc(dx, y + h, doorW, -Math.PI / 2, 0); ctx.stroke();
          } else if (door.wall === "top") {
            const dx = x + door.position * scale;
            ctx.beginPath(); ctx.moveTo(dx, y); ctx.lineTo(dx + doorW, y); ctx.stroke();
            ctx.beginPath(); ctx.arc(dx, y, doorW, 0, Math.PI / 2); ctx.stroke();
          } else if (door.wall === "left") {
            const dy = y + h - door.position * scale - doorW;
            ctx.beginPath(); ctx.moveTo(x, dy); ctx.lineTo(x, dy + doorW); ctx.stroke();
            ctx.beginPath(); ctx.arc(x, dy + doorW, doorW, -Math.PI, -Math.PI / 2); ctx.stroke();
          } else {
            const dy = y + h - door.position * scale - doorW;
            ctx.beginPath(); ctx.moveTo(x + w, dy); ctx.lineTo(x + w, dy + doorW); ctx.stroke();
            ctx.beginPath(); ctx.arc(x + w, dy + doorW, doorW, -Math.PI / 2, 0); ctx.stroke();
          }
          ctx.setLineDash([]);
        }
      }

      // Room label
      ctx.fillStyle = "#e7e5e4";
      ctx.font = `bold ${Math.max(10, Math.min(13, w / 8))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(room.name, x + w / 2, y + h / 2 - 8);

      // Dimensions
      ctx.fillStyle = "#78716c";
      ctx.font = `${Math.max(8, Math.min(11, w / 10))}px sans-serif`;
      ctx.fillText(`${room.width}m × ${room.height}m`, x + w / 2, y + h / 2 + 10);
    });

    // Scale bar
    const barMeters = Math.round(plan.totalWidth / 4);
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
  }, [plan]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}
