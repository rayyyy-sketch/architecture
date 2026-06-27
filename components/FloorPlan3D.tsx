"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { FloorPlan } from "@/lib/dxfGenerator";
import { roomPolygon, centroid } from "@/lib/geometry";

const ROOM_COLORS = [
  0x8b7355, 0x6b8e8b, 0x7a8b6b, 0x8b6b7a, 0x6b7a8b,
  0x8b8b6b, 0x7a6b8b, 0x6b8b7a, 0x8b7a6b, 0x6b6b8b,
];

export default function FloorPlan3D({ plan }: { plan: FloorPlan }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 800;
    const H = mount.clientHeight || 600;

    // Bounds across all footprints
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const room of plan.rooms) {
      for (const p of roomPolygon(room)) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = plan.totalWidth; maxY = plan.totalHeight; }
    const spanX = maxX - minX;
    const spanZ = maxY - minY;
    const cx = (minX + maxX) / 2;
    const cz = (minY + maxY) / 2;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1c1917);
    scene.fog = new THREE.Fog(0x1c1917, spanX + spanZ, (spanX + spanZ) * 3 + 40);

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 500);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
    sun.position.set(spanX, spanX + spanZ, spanZ);
    sun.castShadow = true;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xe0f0ff, 0.3);
    fill.position.set(-spanX, spanX, -spanZ);
    scene.add(fill);

    // Ground + grid
    const groundSize = Math.max(spanX, spanZ) + 8;
    const floorGeo = new THREE.PlaneGeometry(groundSize, groundSize);
    const floor = new THREE.Mesh(floorGeo, new THREE.MeshLambertMaterial({ color: 0x292524 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, -0.01, cz);
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(groundSize, Math.ceil(groundSize), 0x3d3836, 0x292524);
    grid.position.set(cx, 0, cz);
    scene.add(grid);

    const wallHeight = 3;
    const wallThickness = 0.15;

    plan.rooms.forEach((room, i) => {
      const color = ROOM_COLORS[i % ROOM_COLORS.length];
      const poly = roomPolygon(room);

      // Floor slab from the footprint shape
      const shape = new THREE.Shape();
      poly.forEach((p, j) => (j === 0 ? shape.moveTo(p.x, p.y) : shape.lineTo(p.x, p.y)));
      shape.closePath();
      const slab = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshLambertMaterial({ color: 0x14110f, side: THREE.DoubleSide })
      );
      slab.rotation.x = Math.PI / 2; // XY shape -> XZ ground plane (z = plan y)
      slab.position.y = 0.03;
      slab.receiveShadow = true;
      scene.add(slab);

      // Walls along each edge (handles angled / non-orthogonal footprints)
      const wallMat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.82 });
      for (let j = 0; j < poly.length; j++) {
        const a = poly[j];
        const b = poly[(j + 1) % poly.length];
        const dx = b.x - a.x;
        const dz = b.y - a.y;
        const len = Math.hypot(dx, dz);
        if (len < 0.01) continue;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(len, wallHeight, wallThickness), wallMat);
        wall.position.set((a.x + b.x) / 2, wallHeight / 2, (a.y + b.y) / 2);
        wall.rotation.y = -Math.atan2(dz, dx);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
      }

      // Glowing top edge
      const topShape = new THREE.Shape();
      poly.forEach((p, j) => (j === 0 ? topShape.moveTo(p.x, p.y) : topShape.lineTo(p.x, p.y)));
      topShape.closePath();
      const edgePts = topShape.getPoints(2).map((p) => new THREE.Vector3(p.x, wallHeight, p.y));
      const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePts);
      const edges = new THREE.LineLoop(edgeGeo, new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.45 }));
      scene.add(edges);

      // Room label sprite
      const c = centroid(poly);
      const lc = document.createElement("canvas");
      lc.width = 256; lc.height = 64;
      const lctx = lc.getContext("2d")!;
      lctx.fillStyle = "#e7e5e4";
      lctx.font = "bold 22px sans-serif";
      lctx.textAlign = "center";
      lctx.textBaseline = "middle";
      lctx.fillText(room.name, 128, 32);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc), transparent: true }));
      sprite.scale.set(3, 0.75, 1);
      sprite.position.set(c.x, wallHeight / 2, c.y);
      scene.add(sprite);
    });

    // Orbit (manual drag)
    let isDown = false;
    let lastX = 0, lastY = 0;
    let theta = Math.PI / 4;
    let phi = Math.PI / 4;
    const radius = Math.max(spanX, spanZ) * 1.6 + 6;

    const updateCamera = () => {
      camera.position.set(
        cx + radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(phi),
        cz + radius * Math.cos(theta) * Math.cos(phi)
      );
      camera.lookAt(cx, 0, cz);
    };

    const onDown = (e: MouseEvent) => { isDown = true; lastX = e.clientX; lastY = e.clientY; };
    const onUp = () => { isDown = false; };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      theta -= (e.clientX - lastX) * 0.01;
      phi = Math.max(0.1, Math.min(Math.PI / 2.2, phi - (e.clientY - lastY) * 0.01));
      lastX = e.clientX; lastY = e.clientY;
      updateCamera();
    };

    renderer.domElement.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    updateCamera();

    let animId: number;
    const animate = () => { animId = requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.domElement.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [plan]);

  return (
    <div className="relative w-full" style={{ minHeight: 500 }}>
      <div ref={mountRef} className="w-full h-full" style={{ minHeight: 500 }} />
      <div className="absolute bottom-3 left-3 text-stone-600 text-xs">Click &amp; drag to rotate</div>
    </div>
  );
}
