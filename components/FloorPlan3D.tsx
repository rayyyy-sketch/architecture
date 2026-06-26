"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { FloorPlan } from "@/lib/dxfGenerator";

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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1c1917);
    scene.fog = new THREE.Fog(0x1c1917, 30, 80);

    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 200);
    const cx = plan.totalWidth / 2;
    const cz = plan.totalHeight / 2;
    camera.position.set(cx + plan.totalWidth * 0.8, plan.totalWidth * 0.6, cz + plan.totalHeight * 0.8);
    camera.lookAt(cx, 0, cz);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
    sun.position.set(20, 30, 20);
    sun.castShadow = true;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xe0f0ff, 0.3);
    fill.position.set(-10, 10, -10);
    scene.add(fill);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(plan.totalWidth + 4, plan.totalHeight + 4);
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x292524 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, -0.01, cz);
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid
    const grid = new THREE.GridHelper(plan.totalWidth + 4, plan.totalWidth + 4, 0x3d3836, 0x292524);
    grid.position.set(cx, 0, cz);
    scene.add(grid);

    const wallHeight = 3;
    const wallThickness = 0.15;

    plan.rooms.forEach((room, i) => {
      const color = ROOM_COLORS[i % ROOM_COLORS.length];

      // Floor slab
      const slabGeo = new THREE.BoxGeometry(room.width - wallThickness, 0.08, room.height - wallThickness);
      const slabMat = new THREE.MeshLambertMaterial({ color: 0x1c1917 });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set(room.x + room.width / 2, 0.04, room.y + room.height / 2);
      scene.add(slab);

      // Four walls
      const wallMat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.85 });

      const makeWall = (w: number, h: number, d: number, px: number, py: number, pz: number) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.position.set(px, py, pz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
      };

      const x = room.x;
      const z = room.y;
      const rw = room.width;
      const rh = room.height;
      const wh = wallHeight;
      const wt = wallThickness;
      const hy = wh / 2;

      // Bottom wall
      makeWall(rw, wh, wt, x + rw / 2, hy, z);
      // Top wall
      makeWall(rw, wh, wt, x + rw / 2, hy, z + rh);
      // Left wall
      makeWall(wt, wh, rh, x, hy, z + rh / 2);
      // Right wall
      makeWall(wt, wh, rh, x + rw, hy, z + rh / 2);

      // Ceiling edge (wire frame top)
      const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(rw, 0.05, rh));
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, opacity: 0.4, transparent: true });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      edges.position.set(x + rw / 2, wh, z + rh / 2);
      scene.add(edges);

      // Label (sprite)
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = "#e7e5e4";
      ctx.font = "bold 22px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(room.name, 128, 32);
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(3, 0.75, 1);
      sprite.position.set(x + rw / 2, wh / 2, z + rh / 2);
      scene.add(sprite);
    });

    // Orbit controls (manual drag)
    let isDown = false;
    let lastX = 0, lastY = 0;
    let theta = Math.PI / 4;
    let phi = Math.PI / 4;
    const radius = Math.max(plan.totalWidth, plan.totalHeight) * 1.5;

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
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
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
      <div className="absolute bottom-3 left-3 text-stone-600 text-xs">Click & drag to rotate</div>
    </div>
  );
}
