"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useChessGame, isKingInCheckSquare } from "@/hooks/useChessGame";
import { useSettings, getBoardTheme } from "@/hooks/useSettings";
import { PieceColor, PieceType, Square } from "@/lib/chess/types";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

// Classic chess piece models ("Complete Chess Set") loaded from
// public/models/chess3d/fbx; we tint them in-app. Falls back to the built-in
// lathe pieces when the models cannot be loaded.
const MODEL_FILES: Record<PieceType, string> = {
  k: "king",
  q: "queen",
  r: "rook",
  b: "bishop",
  n: "knight",
  p: "pawn",
};

interface ChessBoard3DProps {
  blindfold?: boolean;
  onSquareClick: (sq: Square) => void;
  onUnsupported: () => void;
}

// ---------------------------------------------------------------------------
// Piece geometry: one hand-made classic design (no piece-set dependency).
// Units: 1 = one board square. Pieces sit with their base at y = 0.
// ---------------------------------------------------------------------------

type Profile = [number, number][];

function lathe(profile: Profile, segments = 24): THREE.BufferGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, segments);
}

function box(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  ry = 0
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}

function sph(r: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, 14, 10);
  g.translate(x, y, z);
  return g;
}

const PAWN_PROFILE: Profile = [
  [0.0, 0.0],
  [0.28, 0.0],
  [0.30, 0.03],
  [0.27, 0.06],
  [0.18, 0.10],
  [0.13, 0.13],
  [0.115, 0.24],
  [0.10, 0.28],
  [0.16, 0.32],
  [0.20, 0.38],
  [0.195, 0.46],
  [0.14, 0.52],
  [0.07, 0.55],
  [0.0, 0.56],
];

const ROOK_BASE_PROFILE: Profile = [
  [0.0, 0.0],
  [0.30, 0.0],
  [0.32, 0.03],
  [0.29, 0.06],
  [0.22, 0.10],
  [0.20, 0.14],
  [0.185, 0.42],
  [0.165, 0.48],
  [0.24, 0.52],
  [0.27, 0.56],
  [0.27, 0.62],
  [0.0, 0.62],
];

const BISHOP_PROFILE: Profile = [
  [0.0, 0.0],
  [0.30, 0.0],
  [0.32, 0.03],
  [0.29, 0.06],
  [0.21, 0.10],
  [0.16, 0.14],
  [0.14, 0.30],
  [0.13, 0.34],
  [0.20, 0.40],
  [0.22, 0.48],
  [0.17, 0.56],
  [0.12, 0.64],
  [0.09, 0.72],
  [0.06, 0.78],
  [0.0, 0.80],
];

const QUEEN_PROFILE: Profile = [
  [0.0, 0.0],
  [0.32, 0.0],
  [0.34, 0.03],
  [0.31, 0.06],
  [0.23, 0.10],
  [0.18, 0.14],
  [0.165, 0.40],
  [0.15, 0.46],
  [0.24, 0.50],
  [0.28, 0.56],
  [0.27, 0.66],
  [0.24, 0.72],
  [0.0, 0.72],
];

const KING_PROFILE: Profile = [
  [0.0, 0.0],
  [0.32, 0.0],
  [0.34, 0.03],
  [0.31, 0.06],
  [0.23, 0.10],
  [0.18, 0.14],
  [0.165, 0.44],
  [0.15, 0.50],
  [0.24, 0.54],
  [0.28, 0.60],
  [0.27, 0.72],
  [0.24, 0.78],
  [0.0, 0.78],
];

function knightGeometry(): THREE.BufferGeometry {
  // Hand-made knight silhouette (facing -x), extruded with a soft bevel.
  const pts: [number, number][] = [
    [0.30, 0.0],
    [0.30, 0.09],
    [0.15, 0.13],
    [0.08, 0.21],
    [0.02, 0.31],
    [-0.03, 0.45],
    [-0.07, 0.58],
    [-0.08, 0.70],
    [-0.03, 0.80],
    [-0.10, 0.86],
    [-0.17, 0.79],
    [-0.22, 0.72],
    [-0.30, 0.68],
    [-0.40, 0.61],
    [-0.46, 0.52],
    [-0.43, 0.44],
    [-0.35, 0.42],
    [-0.27, 0.45],
    [-0.21, 0.39],
    [-0.15, 0.31],
    [-0.10, 0.25],
    [-0.02, 0.18],
    [0.09, 0.14],
    [0.18, 0.12],
    [0.30, 0.10],
  ];
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.30,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 2,
    steps: 1,
  });
  g.translate(0, 0, -0.15);
  return g;
}

let GEOMS: Record<PieceType, THREE.BufferGeometry[]> | null = null;

function getGeoms(): Record<PieceType, THREE.BufferGeometry[]> {
  if (GEOMS) return GEOMS;
  const rookMerlons: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rookMerlons.push(
      box(0.10, 0.10, 0.10, Math.sin(a) * 0.185, 0.67, Math.cos(a) * 0.185, a)
    );
  }
  const queenCrown: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    queenCrown.push(sph(0.05, Math.sin(a) * 0.23, 0.78, Math.cos(a) * 0.23));
  }
  GEOMS = {
    p: [lathe(PAWN_PROFILE)],
    r: [lathe(ROOK_BASE_PROFILE), ...rookMerlons],
    b: [
      lathe(BISHOP_PROFILE),
      sph(0.055, 0, 0.85, 0),
      box(0.035, 0.14, 0.09, 0, 0.64, 0.1, 0),
    ],
    q: [
      lathe(QUEEN_PROFILE),
      new THREE.TorusGeometry(0.23, 0.042, 8, 28)
        .rotateX(Math.PI / 2)
        .translate(0, 0.74, 0),
      ...queenCrown,
      sph(0.065, 0, 0.84, 0),
    ],
    k: [
      lathe(KING_PROFILE),
      box(0.05, 0.24, 0.05, 0, 0.88, 0),
      box(0.17, 0.05, 0.05, 0, 0.92, 0),
    ],
    n: [knightGeometry()],
  };
  return GEOMS;
}

const MAT_LIGHT = new THREE.MeshStandardMaterial({
  color: 0xf3ebd8,
  roughness: 0.55,
  metalness: 0.05,
});
const MAT_DARK = new THREE.MeshStandardMaterial({
  color: 0x3a2e24,
  roughness: 0.6,
  metalness: 0.05,
});
const SHADOW_GEOM = new THREE.CircleGeometry(0.33, 20).rotateX(-Math.PI / 2);

// ---------------------------------------------------------------------------

interface Tween {
  start: number;
  dur: number;
  delay: number;
  update: (k: number) => void;
  done?: () => void;
}

function easeOutCubic(k: number): number {
  return 1 - Math.pow(1 - k, 3);
}

function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Stagger used by the setup animation (mirrors the 2D board).
function setupDelay(r: number, c: number): number {
  let idx: number;
  if (r === 6) idx = c;
  else if (r === 1) idx = 8 + c;
  else if (r === 7) idx = 16 + c;
  else idx = 24 + c;
  return 0.05 + idx * 0.045;
}

export default function ChessBoard3D({
  blindfold = false,
  onSquareClick,
  onUnsupported,
}: ChessBoard3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const modelsRef = useRef<Partial<Record<PieceType, THREE.BufferGeometry>>>({});
  const woodImgRef = useRef<HTMLImageElement | null>(null);
  const boardRef = useRef<{
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
  } | null>(null);
  const rebuildRef = useRef(false);
  const [modelsToken, setModelsToken] = useState(0);
  const [modelsFailed, setModelsFailed] = useState(false);
  const [boardToken, setBoardToken] = useState(0);

  const boardThemeId = useSettings((s) => s.boardTheme);
  const theme = getBoardTheme(boardThemeId);

  // Reactive game values (effects below sync the scene).
  const board = useChessGame((s) => s.state.board);
  const lastMove = useChessGame((s) => s.lastMove);
  const selected = useChessGame((s) => s.selected);
  const legalForSelected = useChessGame((s) => s.legalForSelected);
  const hintMove = useChessGame((s) => s.hintMove);
  const flipped = useChessGame((s) => s.flipped);
  const status = useChessGame((s) => s.status);
  const thinking = useChessGame((s) => s.thinking);
  const gameId = useChessGame((s) => s.gameId);

  const three = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    boardGroup: THREE.Group;
    piecesGroup: THREE.Group;
    highlightGroup: THREE.Group;
    pieces: Map<string, { group: THREE.Group; type: PieceType; color: PieceColor }>;
    tweens: Tween[];
    az: number;
    azTarget: number;
    dist: number;
    dirty: boolean;
    raf: number;
    setupUntil: number;
    disposed: boolean;
  } | null>(null);

  const syncOverlayRef = useRef<() => void>(() => {});
  const updateCameraRef = useRef<() => void>(() => {});

  // --- one-time scene setup -------------------------------------------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      if (!renderer.getContext()) throw new Error("no context");
    } catch {
      onUnsupported();
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    const boardGroup = new THREE.Group();
    const piecesGroup = new THREE.Group();
    const highlightGroup = new THREE.Group();
    scene.add(boardGroup, piecesGroup, highlightGroup);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(6, 12, 8);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.35);
    dir2.position.set(-7, 9, -6);
    scene.add(dir2);

    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.zIndex = "0";
    container.appendChild(renderer.domElement);

    const state = {
      renderer,
      scene,
      camera,
      boardGroup,
      piecesGroup,
      highlightGroup,
      pieces: new Map<
        string,
        { group: THREE.Group; type: PieceType; color: PieceColor }
      >(),
      tweens: [] as Tween[],
      az: useChessGame.getState().flipped ? Math.PI : 0,
      azTarget: useChessGame.getState().flipped ? Math.PI : 0,
      dist: 15,
      dirty: true,
      raf: 0,
      setupUntil: performance.now() + 2400,
      disposed: false,
    };
    three.current = state;

    const target = new THREE.Vector3(0, 0.1, 0);
    const el = THREE.MathUtils.degToRad(34);

    const FRAME_CORNERS = [
      new THREE.Vector3(-4, 1.05, -4),
      new THREE.Vector3(4, 1.05, -4),
      new THREE.Vector3(-4, 1.05, 4),
      new THREE.Vector3(4, 1.05, 4),
      new THREE.Vector3(-4, 0, -4),
      new THREE.Vector3(4, 0, -4),
      new THREE.Vector3(-4, 0, 4),
      new THREE.Vector3(4, 0, 4),
    ];

    function updateCamera() {
      const s = three.current;
      if (!s) return;
      s.camera.position.set(
        target.x + s.dist * Math.cos(el) * Math.sin(s.az),
        target.y + s.dist * Math.sin(el),
        target.z + s.dist * Math.cos(el) * Math.cos(s.az)
      );
      s.camera.lookAt(target);
    }

    // Iterative auto-fit: keep every board corner (and piece tops) inside
    // the frame with a small margin, centered.
    function fitDistance(az: number) {
      let dist = 14;
      const v = new THREE.Vector3();
      for (let i = 0; i < 5; i++) {
        camera.position.set(
          target.x + dist * Math.cos(el) * Math.sin(az),
          target.y + dist * Math.sin(el),
          target.z + dist * Math.cos(el) * Math.cos(az)
        );
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        let maxAbs = 0;
        for (const p of FRAME_CORNERS) {
          v.copy(p).project(camera);
          maxAbs = Math.max(maxAbs, Math.abs(v.x), Math.abs(v.y));
        }
        dist *= maxAbs * 1.04;
      }
      return dist;
    }

    const v = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    function syncOverlay() {
      const s = three.current;
      const overlay = overlayRef.current;
      if (!s || !overlay) return;
      const w = overlay.clientWidth;
      const h = overlay.clientHeight;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const btn = buttonRefs.current.get(`${r}-${c}`);
          if (!btn) continue;
          v.set(c - 3.5, 0.02, r - 3.5).project(s.camera);
          const x = (v.x * 0.5 + 0.5) * w;
          const y = (-v.y * 0.5 + 0.5) * h;
          v2.set(c - 3.5 + 0.5, 0.02, r - 3.5).project(s.camera);
          const x2 = (v2.x * 0.5 + 0.5) * w;
          const size = Math.max(18, Math.abs(x2 - x));
          btn.style.left = `${Math.round(x - size / 2)}px`;
          btn.style.top = `${Math.round(y - size / 2)}px`;
          btn.style.width = `${Math.round(size)}px`;
          btn.style.height = `${Math.round(size)}px`;
        }
      }
    }
    syncOverlayRef.current = syncOverlay;
    updateCameraRef.current = updateCamera;

    function resize() {
      const s = three.current;
      const cont = containerRef.current;
      if (!s || !cont) return;
      const w = cont.clientWidth;
      const h = cont.clientHeight;
      if (w === 0 || h === 0) return;
      s.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      s.renderer.setSize(w, h);
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
      s.dist = fitDistance(s.az);
      updateCamera();
      syncOverlay();
      s.dirty = true;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    function loop(now: number) {
      const s = three.current;
      if (!s || s.disposed) return;
      s.raf = requestAnimationFrame(loop);
      let active = false;

      // camera azimuth animation (Girar)
      if (Math.abs(s.az - s.azTarget) > 0.001) {
        const step = 0.055;
        const d = s.azTarget - s.az;
        s.az += Math.abs(d) < step ? d : Math.sign(d) * step;
        updateCamera();
        syncOverlay();
        active = true;
      }

      // tweens
      if (s.tweens.length > 0) {
        const keep: Tween[] = [];
        for (const t of s.tweens) {
          const t0 = t.start + t.delay;
          if (now < t0) {
            keep.push(t);
            active = true;
            continue;
          }
          const k = Math.min(1, (now - t0) / t.dur);
          t.update(easeOutCubic(k));
          if (k < 1) keep.push(t);
          else t.done?.();
          active = true;
        }
        s.tweens = keep;
      }

      // check highlight pulse
      const pulse = highlightGroup.getObjectByName("check-pulse");
      if (pulse) {
        const m = (pulse as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.opacity = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(now / 260));
        active = true;
      }
      const hintPulse = highlightGroup.getObjectByName("hint-pulse");
      if (hintPulse) {
        const m = (hintPulse as THREE.Mesh).material as THREE.MeshBasicMaterial;
        m.opacity = 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(now / 220));
        active = true;
      }

      if (active || s.dirty) {
        s.renderer.render(s.scene, s.camera);
        s.dirty = false;
      }
    }
    state.raf = requestAnimationFrame(loop);

    // Load the piece models and swap them in when ready.
    let cancelled = false;
    (async () => {
      try {
        // Imported wooden board (carved box from the CC-BY set).
        try {
          const { GLTFLoader } = await import(
            "three/examples/jsm/loaders/GLTFLoader.js"
          );
          const gltfLoader = new GLTFLoader();
          const boardGltf = await gltfLoader.loadAsync(
            "/models/chess3d/board.glb"
          );
          let boardMesh: THREE.Mesh | null = null;
          boardGltf.scene.traverse((o) => {
            const m = o as THREE.Mesh;
            if (!boardMesh && m.isMesh) boardMesh = m;
          });
          if (boardMesh) {
            const bm = boardMesh as THREE.Mesh;
            bm.updateWorldMatrix(true, false);
            const g = bm.geometry.clone().applyMatrix4(bm.matrixWorld);
            g.computeBoundingBox();
            const bb = g.boundingBox;
            if (bb) {
              const s = 8.75 / Math.max(0.001, bb.max.x - bb.min.x);
              g.translate(
                -(bb.min.x + bb.max.x) / 2,
                -bb.max.y,
                -(bb.min.z + bb.max.z) / 2
              );
              g.scale(s, s, s);
              if (cancelled) return;
              boardRef.current = {
                geometry: g,
                material: bm.material as THREE.Material,
              };
              setBoardToken((v) => v + 1);
            }
          }
        } catch {
          // Keep the procedural base if the board model cannot be loaded.
        }

        const { FBXLoader } = await import(
          "three/examples/jsm/loaders/FBXLoader.js"
        );
        const loader = new FBXLoader();
        const raw: Partial<Record<PieceType, THREE.BufferGeometry>> = {};
        for (const [t, file] of Object.entries(MODEL_FILES) as [
          PieceType,
          string,
        ][]) {
          const obj = await loader.loadAsync(`/models/chess3d/fbx/${file}.fbx`);
          let mesh: THREE.Mesh | null = null;
          obj.traverse((o) => {
            const m = o as THREE.Mesh;
            if (!mesh && m.isMesh) mesh = m;
          });
          if (mesh) {
            // Bake the node transforms (the source files carry their scale in
            // the scene graph) and make sure the geometry has normals.
            (mesh as THREE.Mesh).updateWorldMatrix(true, false);
            const g = (mesh as THREE.Mesh).geometry
              .clone()
              .applyMatrix4((mesh as THREE.Mesh).matrixWorld);
            if (!g.getAttribute("normal")) g.computeVertexNormals();
            raw[t] = g;
          }
        }
        const kingGeom = raw.k;
        if (!kingGeom) return;
        kingGeom.computeBoundingBox();
        const kb = kingGeom.boundingBox;
        if (!kb) return;
        const factor = 1.32 / Math.max(0.001, kb.max.y - kb.min.y);
        for (const g of Object.values(raw)) {
          if (!g) continue;
          g.computeBoundingBox();
          const bb = g.boundingBox;
          if (!bb) continue;
          g.translate(
            -(bb.min.x + bb.max.x) / 2,
            -bb.min.y,
            -(bb.min.z + bb.max.z) / 2
          );
          g.scale(factor, factor, factor);
        }
        // Orient the knight like the 2D artwork (facing the board's left).
        if (raw.n) raw.n.rotateY(Math.PI);
        if (cancelled) return;
        modelsRef.current = raw;
        // Start the staggered setup drop-in once the real models are ready,
        // so the old fallback pieces are never shown during the animation.
        state.setupUntil = performance.now() + 2400;
        setModelsToken((v) => v + 1);
      } catch {
        // Keep the built-in lathe pieces if the models cannot be loaded.
        if (!cancelled) setModelsFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      state.disposed = true;
      cancelAnimationFrame(state.raf);
      ro.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
      three.current = null;
    };
  }, []);

  // --- board (wood-textured top + base) rebuild on theme change -------------
  useEffect(() => {
    const s = three.current;
    if (!s) return;
    s.boardGroup.clear();

    // Compose the board-top texture on a canvas: walnut wood + tinted squares.
    const SIZE = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const baseTex = new THREE.CanvasTexture(canvas);
    baseTex.colorSpace = THREE.SRGBColorSpace;
    baseTex.wrapS = THREE.RepeatWrapping;
    baseTex.wrapT = THREE.RepeatWrapping;
    baseTex.repeat.set(5, 1);
    const texs = [tex, baseTex];

    const paint = (img?: HTMLImageElement | null) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (img) {
        // tile the wood 2x2 for a finer grain across the board
        const half = SIZE / 2;
        for (let tx = 0; tx < 2; tx++) {
          for (let ty = 0; ty < 2; ty++) {
            ctx.drawImage(img, tx * half, ty * half, half, half);
          }
        }
      } else {
        ctx.fillStyle = theme.light;
        ctx.fillRect(0, 0, SIZE, SIZE);
      }
      const cell = SIZE / 8;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const isLight = (r + c) % 2 === 0;
          ctx.fillStyle = isLight
            ? withAlpha(theme.light, 0.68)
            : withAlpha(theme.dark, 0.85);
          ctx.fillRect(c * cell, r * cell, cell, cell);
        }
      }
      // subtle grid lines
      ctx.strokeStyle = "rgba(20,12,8,0.22)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cell);
        ctx.lineTo(SIZE, i * cell);
        ctx.stroke();
      }
      for (const t of texs) t.needsUpdate = true;
    };
    paint(woodImgRef.current);
    if (!woodImgRef.current) {
      const img = new Image();
      img.src = "/models/chess3d/wood/walnut.jpg";
      img
        .decode()
        .then(() => {
          if (s.disposed) return;
          woodImgRef.current = img;
          paint(img);
          s.dirty = true;
        })
        .catch(() => {
          // keep the tinted board if the texture cannot be loaded
        });
    }

    // board top: one textured plane
    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 })
    );
    top.position.y = 0.003;
    s.boardGroup.add(top);

    // frame + sides: imported carved board when available, procedural base
    // as fallback.
    const imported = boardRef.current;
    if (imported) {
      const bmesh = new THREE.Mesh(imported.geometry, imported.material);
      s.boardGroup.add(bmesh);
    } else {
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(8.75, 0.5, 8.75),
        new THREE.MeshStandardMaterial({
          map: baseTex,
          color: new THREE.Color(theme.dark).multiplyScalar(0.72),
          roughness: 0.8,
        })
      );
      base.position.y = -0.25;
      s.boardGroup.add(base);
    }

    s.dirty = true;
  }, [theme, boardToken]);

  // --- pieces sync (create / move / capture / promotion / setup drop-in) ----
  useEffect(() => {
    const s = three.current;
    if (!s) return;
    // Wait for the piece models before creating anything, so the setup
    // animation always uses the real pieces (fallback only if loading fails).
    if (modelsToken === 0 && !modelsFailed) return;
    if (rebuildRef.current) {
      rebuildRef.current = false;
      s.pieces.forEach((entry) => s.piecesGroup.remove(entry.group));
      s.pieces.clear();
      // Model swap: pop the pieces in quickly instead of replaying the
      // staggered game-start drop-in.
      s.setupUntil = 0;
    }
    const now = performance.now();
    const prev = s.pieces;
    const next = new Map<
      string,
      { group: THREE.Group; type: PieceType; color: PieceColor }
    >();

    // detect a normal move so the piece glides from -> to
    if (lastMove) {
      const fk = `${lastMove.from.row}-${lastMove.from.col}`;
      const tk = `${lastMove.to.row}-${lastMove.to.col}`;
      const fromEntry = prev.get(fk);
      const toPiece = board[lastMove.to.row][lastMove.to.col];
      if (
        fromEntry &&
        toPiece &&
        fromEntry.type === toPiece.type &&
        fromEntry.color === toPiece.color
      ) {
        const captured = prev.get(tk);
        if (captured) {
          const g = captured.group;
          s.tweens.push({
            start: now,
            dur: 200,
            delay: 0,
            update: (k) => {
              g.scale.setScalar(1 - k * 0.95);
            },
            done: () => {
              s.piecesGroup.remove(g);
            },
          });
          prev.delete(tk);
        }
        prev.delete(fk);
        next.set(tk, fromEntry);
        const from = new THREE.Vector3(
          lastMove.from.col - 3.5,
          0,
          lastMove.from.row - 3.5
        );
        const to = new THREE.Vector3(
          lastMove.to.col - 3.5,
          0,
          lastMove.to.row - 3.5
        );
        s.tweens.push({
          start: now,
          dur: 300,
          delay: 0,
          update: (k) => {
            fromEntry.group.position.lerpVectors(from, to, k);
            fromEntry.group.position.y = Math.sin(Math.PI * k) * 0.35;
          },
          done: () => {
            fromEntry.group.position.copy(to);
          },
        });
      }
    }

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;
        const key = `${r}-${c}`;
        if (next.has(key)) continue;
        const existing = prev.get(key);
        if (
          existing &&
          existing.type === piece.type &&
          existing.color === piece.color
        ) {
          prev.delete(key);
          next.set(key, existing);
          continue;
        }
        if (existing) {
          const g = existing.group;
          s.tweens.push({
            start: now,
            dur: 160,
            delay: 0,
            update: (k) => {
              g.scale.setScalar(1 - k * 0.95);
            },
            done: () => {
              s.piecesGroup.remove(g);
            },
          });
          prev.delete(key);
        }
        const group = new THREE.Group();
        // Black pieces face the opposite way (towards the white side), like on
        // a real board.
        if (piece.color === "b") group.rotation.y = Math.PI;
        const mat = piece.color === "w" ? MAT_LIGHT : MAT_DARK;
        const modelGeom = modelsRef.current[piece.type];
        const geoms = modelGeom ? [modelGeom] : getGeoms()[piece.type];
        for (const geom of geoms) {
          group.add(new THREE.Mesh(geom, mat));
        }
        const shadow = new THREE.Mesh(
          SHADOW_GEOM,
          new THREE.MeshBasicMaterial({
            color: 0x120c08,
            transparent: true,
            opacity: 0.26,
            depthWrite: false,
          })
        );
        shadow.position.y = 0.015;
        group.add(shadow);
        group.position.set(c - 3.5, 0, r - 3.5);
        s.piecesGroup.add(group);
        const isSetup = now < s.setupUntil;
        const delay = isSetup ? setupDelay(r, c) * 1000 : 0;
        group.visible = !isSetup;
        s.tweens.push({
          start: now,
          dur: isSetup ? 420 : 160,
          delay,
          update: (k) => {
            group.visible = true;
            group.position.y = (1 - k) * (isSetup ? 0.9 : 0.35);
            group.scale.setScalar(0.5 + 0.5 * k);
          },
          done: () => {
            group.position.y = 0;
            group.scale.setScalar(1);
          },
        });
        next.set(key, { group, type: piece.type, color: piece.color });
      }
    }

    // anything left in prev is gone (undo / captures not via lastMove)
    prev.forEach((entry) => {
      s.tweens.push({
        start: now,
        dur: 160,
        delay: 0,
        update: (k) => {
          entry.group.scale.setScalar(1 - k * 0.95);
        },
        done: () => {
          s.piecesGroup.remove(entry.group);
        },
      });
    });

    s.pieces = next;
    s.dirty = true;
  }, [board, lastMove, modelsToken, modelsFailed]);

  // new game -> replay the staggered setup drop-in
  useEffect(() => {
    const s = three.current;
    if (!s || gameId === 0) return;
    s.setupUntil = performance.now() + 2400;
  }, [gameId]);

  // --- highlights -----------------------------------------------------------
  useEffect(() => {
    const s = three.current;
    if (!s) return;
    s.highlightGroup.clear();

    const plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const disc = new THREE.CircleGeometry(0.15, 20).rotateX(-Math.PI / 2);
    const ring = new THREE.TorusGeometry(0.33, 0.035, 8, 26).rotateX(
      Math.PI / 2
    );

    function tileMesh(
      r: number,
      c: number,
      material: THREE.Material,
      geom: THREE.BufferGeometry = plane,
      y = 0.012,
      name?: string
    ) {
      const m = new THREE.Mesh(geom, material);
      m.position.set(c - 3.5, y, r - 3.5);
      if (name) m.name = name;
      s!.highlightGroup.add(m);
    }

    if (lastMove) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xd8ba7d,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      tileMesh(lastMove.from.row, lastMove.from.col, mat);
      tileMesh(lastMove.to.row, lastMove.to.col, mat);
    }

    const checkSquare = isKingInCheckSquare(
      useChessGame.getState().state,
      useChessGame.getState().state.turn
    );
    if (checkSquare) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xa04038,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });
      tileMesh(checkSquare.row, checkSquare.col, mat, plane, 0.013, "check-pulse");
    }

    if (selected) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xe3a63d,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      });
      tileMesh(selected.row, selected.col, mat, plane, 0.014);
      for (const m of legalForSelected) {
        const isCapture = !!m.captured || m.isEnPassant;
        const lm = new THREE.MeshBasicMaterial({
          color: isCapture ? 0x3e8a57 : 0x1c150f,
          transparent: true,
          opacity: isCapture ? 0.9 : 0.5,
          depthWrite: false,
        });
        tileMesh(
          m.to.row,
          m.to.col,
          lm,
          isCapture ? ring : disc,
          isCapture ? 0.02 : 0.02
        );
      }
    }

    if (hintMove) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xd8ba7d,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      });
      tileMesh(hintMove.from.row, hintMove.from.col, mat, plane, 0.016, "hint-pulse");
      tileMesh(hintMove.to.row, hintMove.to.col, mat, plane, 0.016, "hint-pulse");
    }

    s.dirty = true;
  }, [selected, legalForSelected, lastMove, hintMove, status]);

  // --- camera flip (Girar) --------------------------------------------------
  useEffect(() => {
    const s = three.current;
    if (!s) return;
    s.azTarget = flipped ? Math.PI : 0;
    s.dirty = true;
  }, [flipped]);

  // --- blindfold visibility -------------------------------------------------
  useEffect(() => {
    const s = three.current;
    if (!s) return;
    s.pieces.forEach((entry, key) => {
      const isSelected =
        selected && key === `${selected.row}-${selected.col}`;
      entry.group.visible = !blindfold || !!isSelected;
    });
    s.dirty = true;
  }, [blindfold, selected, board]);

  const buttons: React.ReactNode[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      buttons.push(
        <button
          key={`${r}-${c}`}
          ref={(el) => {
            if (el) buttonRefs.current.set(`${r}-${c}`, el);
            else buttonRefs.current.delete(`${r}-${c}`);
          }}
          onClick={() => onSquareClick({ row: r, col: c })}
          className="absolute rounded-sm"
          style={{ background: "transparent", border: "none", padding: 0 }}
          aria-label={`Casilla ${FILES[c]}${8 - r}`}
        />
      );
    }
  }

  return (
    <div
      className="relative mx-auto"
      style={{
        width: "min(100vw, 860px)",
        maxWidth: "min(100vw, 860px)",
        marginLeft: "calc(50% - min(50vw, 430px))",
        height:
          "min(calc(100vw * 0.82), max(calc(100vh - 300px), 260px), 560px)",
      }}
    >
      <div ref={overlayRef} className="absolute inset-0 z-[1]">
        {buttons}
      </div>
      <div ref={containerRef} className="absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        aria-hidden="true"
      >
        {thinking && (
          <div className="absolute top-2 right-2 flex items-center gap-2 rounded-sm bg-[#241c16]/90 px-3 py-1.5 shadow-lg ring-1 ring-accent-gold/40">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-gold-soft animate-bounce [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-accent-gold-soft animate-bounce [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-accent-gold-soft animate-bounce" />
            </span>
            <span className="text-[11px] font-medium text-[#efe3cf]">
              Pensando…
            </span>
          </div>
        )}
        {status === "check" && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-accent-gold-soft text-xs font-semibold drop-shadow font-display">
            ¡Jaque!
          </div>
        )}
      </div>
    </div>
  );
}
