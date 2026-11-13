import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Chess, Move, PieceSymbol, Square } from 'chess.js';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { BoardThemeId } from '../../types/chess';
import { BOARD_THEMES } from './BoardThemes';

export interface Chessboard3DProps {
  fen: string;
  orientation?: 'w' | 'b';
  boardTheme?: BoardThemeId;
  interactive?: boolean;
  playerColor?: 'w' | 'b' | 'both';
  lastMove?: { from: string; to: string } | null;
  highlightLegalMoves?: boolean;
  onMove?: (from: Square, to: Square, promotion?: PieceSymbol) => boolean | void;
  maxSizePx?: number;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createWoodGrainBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) {
      const v = Math.floor(118 + Math.sin(y * 0.25) * 16 + (Math.random() - 0.5) * 14);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(0, y, 256, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(20, 18, 15, 0.52)');
    grad.addColorStop(0.6, 'rgba(20, 18, 15, 0.18)');
    grad.addColorStop(1, 'rgba(20, 18, 15, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Composite 3-8 part geometric chess piece factory (GEO SET 3D counterpart)
function buildGeoPieceMesh(
  type: PieceSymbol,
  primaryMat: THREE.Material,
  accentMat: THREE.Material,
  shadowDiscGeo: THREE.BufferGeometry,
  shadowDiscMat: THREE.Material,
  castShadow: boolean,
): THREE.Group {
  const group = new THREE.Group();

  // Contact shadow grounding disc at y = 0.008
  const contact = new THREE.Mesh(shadowDiscGeo, shadowDiscMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.008;
  group.add(contact);

  // Shared 2-tier geometric plinth
  const baseBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, 0.09, 20), primaryMat);
  baseBottom.position.y = 0.045;
  baseBottom.castShadow = castShadow;
  group.add(baseBottom);

  const baseCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.33, 0.07, 20), accentMat);
  baseCollar.position.y = 0.125;
  baseCollar.castShadow = castShadow;
  group.add(baseCollar);

  if (type === 'p') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 0.34, 16), primaryMat);
    shaft.position.y = 0.33;
    shaft.castShadow = castShadow;
    group.add(shaft);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 16), accentMat);
    neck.position.y = 0.52;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14), primaryMat);
    head.position.y = 0.67;
    head.castShadow = castShadow;
    group.add(head);
  } else if (type === 'r') {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.48, 8), primaryMat);
    tower.position.y = 0.40;
    tower.castShadow = castShadow;
    group.add(tower);

    const parapet = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.24, 0.14, 8), accentMat);
    parapet.position.y = 0.70;
    parapet.castShadow = castShadow;
    group.add(parapet);

    const merlonGeo = new THREE.BoxGeometry(0.11, 0.09, 0.11);
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + Math.PI / 4;
      const m = new THREE.Mesh(merlonGeo, primaryMat);
      m.position.set(Math.cos(ang) * 0.16, 0.81, Math.sin(ang) * 0.16);
      m.castShadow = castShadow;
      group.add(m);
    }
  } else if (type === 'n') {
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.22, 16), primaryMat);
    pedestal.position.y = 0.27;
    pedestal.castShadow = castShadow;
    group.add(pedestal);

    // Extruded angular horse profile
    const shape = new THREE.Shape();
    shape.moveTo(-0.16, 0);
    shape.lineTo(-0.12, 0.34);
    shape.lineTo(-0.22, 0.42);
    shape.lineTo(-0.08, 0.64);
    shape.lineTo(0.06, 0.72);
    shape.lineTo(0.14, 0.60);
    shape.lineTo(0.22, 0.44);
    shape.lineTo(0.08, 0.34);
    shape.lineTo(0.18, 0);
    shape.closePath();

    const horseGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.20,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.025,
      bevelSegments: 2,
    });
    horseGeo.center();
    const headMesh = new THREE.Mesh(horseGeo, primaryMat);
    headMesh.position.set(0, 0.66, 0);
    headMesh.rotation.y = Math.PI / 2;
    headMesh.castShadow = castShadow;
    group.add(headMesh);

    const maneStrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.08), accentMat);
    maneStrip.position.set(0, 0.68, -0.14);
    maneStrip.rotation.x = 0.25;
    group.add(maneStrip);
  } else if (type === 'b') {
    const pts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.24, 0.0),
      new THREE.Vector2(0.16, 0.38),
      new THREE.Vector2(0.22, 0.56),
      new THREE.Vector2(0.12, 0.78),
      new THREE.Vector2(0.0, 0.88),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), primaryMat);
    body.position.y = 0.16;
    body.castShadow = castShadow;
    group.add(body);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 8, 20), accentMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.54;
    group.add(collar);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), accentMat);
    finial.position.y = 1.07;
    group.add(finial);
  } else if (type === 'q') {
    const pts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.27, 0.0),
      new THREE.Vector2(0.17, 0.45),
      new THREE.Vector2(0.26, 0.76),
      new THREE.Vector2(0.19, 0.86),
      new THREE.Vector2(0.0, 0.86),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 22), primaryMat);
    body.position.y = 0.16;
    body.castShadow = castShadow;
    group.add(body);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.035, 8, 22), accentMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.96;
    group.add(ring);

    const spikeGeo = new THREE.ConeGeometry(0.045, 0.14, 6);
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI) / 3;
      const spike = new THREE.Mesh(spikeGeo, accentMat);
      spike.position.set(Math.cos(ang) * 0.2, 1.06, Math.sin(ang) * 0.2);
      group.add(spike);
    }
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), primaryMat);
    orb.position.y = 1.08;
    group.add(orb);
  } else if (type === 'k') {
    const pts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.28, 0.0),
      new THREE.Vector2(0.18, 0.48),
      new THREE.Vector2(0.25, 0.84),
      new THREE.Vector2(0.0, 0.90),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 22), primaryMat);
    body.position.y = 0.16;
    body.castShadow = castShadow;
    group.add(body);

    const crownBand = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.10, 12), accentMat);
    crownBand.position.y = 0.98;
    group.add(crownBand);

    const crossVert = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.07), accentMat);
    crossVert.position.y = 1.16;
    crossVert.castShadow = castShadow;
    group.add(crossVert);

    const crossHoriz = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.065, 0.07), accentMat);
    crossHoriz.position.y = 1.19;
    crossHoriz.castShadow = castShadow;
    group.add(crossHoriz);
  }

  return group;
}

export const Chessboard3D: React.FC<Chessboard3DProps> = ({
  fen,
  orientation = 'w',
  boardTheme = 'ivory',
  interactive = true,
  playerColor = 'both',
  lastMove = null,
  highlightLegalMoves = true,
  onMove,
  maxSizePx = 620,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  const propsRef = useRef({
    fen,
    orientation,
    boardTheme,
    interactive,
    playerColor,
    lastMove,
    highlightLegalMoves,
    onMove,
    selectedSquare,
  });
  propsRef.current = {
    fen,
    orientation,
    boardTheme,
    interactive,
    playerColor,
    lastMove,
    highlightLegalMoves,
    onMove,
    selectedSquare,
  };

  const sceneSyncRef = useRef<{
    syncBoard: () => void;
    setCameraPreset: (preset: 'white' | 'black' | 'iso' | 'top') => void;
    zoomCamera: (factor: number) => void;
  } | null>(null);

  const palette = BOARD_THEMES[boardTheme] ?? BOARD_THEMES.ivory;

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  // Mount Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL is unavailable in this browser.');
      return;
    }

    const width = container.clientWidth || 540;
    const height = container.clientHeight || 540;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bgColor = new THREE.Color('#DDD3C1');
    scene.background = bgColor;
    scene.fog = new THREE.FogExp2('#DDD3C1', 0.022);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    const initialZ = propsRef.current.orientation === 'w' ? 8.2 : -8.2;
    camera.position.set(0, 7.6, initialZ);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI / 2.25;
    controls.minDistance = 6.5;
    controls.maxDistance = 17;
    controls.target.set(0, 0, 0);

    // 3-point warm/cool lighting rig
    const hemi = new THREE.HemisphereLight(0xdce6f2, 0x7c6b53, 0.58);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff0d8, 1.35);
    keyLight.position.set(6, 11, 5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd2dde8, 0.5);
    rimLight.position.set(-6, 5, -6);
    scene.add(rimLight);

    // Procedural bump & shadow textures
    const bumpTex = createWoodGrainBumpTexture();
    const contactTex = createContactShadowTexture();

    // Board base frame
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x3b352c,
      roughness: 0.55,
      metalness: 0.08,
      bumpMap: bumpTex,
      bumpScale: 0.012,
    });
    const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(8.9, 0.28, 8.9), frameMat);
    frameMesh.position.y = -0.02;
    frameMesh.receiveShadow = !isSoftwareGl;
    scene.add(frameMesh);

    // Ground table disc
    const tablePlane = new THREE.Mesh(
      new THREE.CircleGeometry(28, 48),
      new THREE.MeshStandardMaterial({ color: 0xdfd5c3, roughness: 0.9, metalness: 0.0 }),
    );
    tablePlane.rotation.x = -Math.PI / 2;
    tablePlane.position.y = -0.17;
    tablePlane.receiveShadow = !isSoftwareGl;
    scene.add(tablePlane);

    // 64 Board squares
    const squareMeshes: THREE.Mesh[] = [];
    const squareGeo = new THREE.BoxGeometry(1, 0.12, 1);
    const squareGroups = new THREE.Group();
    scene.add(squareGroups);

    const lightSquareMat = new THREE.MeshStandardMaterial({
      color: palette.lightSquare,
      roughness: 0.65,
      metalness: 0.04,
      bumpMap: bumpTex,
      bumpScale: 0.006,
    });
    const darkSquareMat = new THREE.MeshStandardMaterial({
      color: palette.darkSquare,
      roughness: 0.68,
      metalness: 0.06,
      bumpMap: bumpTex,
      bumpScale: 0.006,
    });
    const highlightSelectMat = new THREE.MeshStandardMaterial({
      color: '#C79246',
      roughness: 0.45,
      metalness: 0.1,
    });
    const highlightLastMat = new THREE.MeshStandardMaterial({
      color: '#D5BE8A',
      roughness: 0.55,
      metalness: 0.05,
    });

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = `${FILES[c]}${8 - r}` as Square;
        const isLight = (r + c) % 2 === 0;
        const sqMesh = new THREE.Mesh(squareGeo, isLight ? lightSquareMat : darkSquareMat);
        sqMesh.position.set(c - 3.5, 0.08, r - 3.5);
        sqMesh.receiveShadow = !isSoftwareGl;
        sqMesh.userData = { square: sq, isLight };
        squareGroups.add(sqMesh);
        squareMeshes.push(sqMesh);
      }
    }

    // Legal move indicator group
    const legalIndicatorGroup = new THREE.Group();
    scene.add(legalIndicatorGroup);
    const dotGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.02, 16);
    const ringGeo = new THREE.RingGeometry(0.32, 0.42, 24);
    const dotMat = new THREE.MeshStandardMaterial({ color: 0x3f3a30, roughness: 0.4, transparent: true, opacity: 0.65 });

    // Piece materials
    const whiteBodyMat = new THREE.MeshStandardMaterial({
      color: 0xded2bc,
      roughness: 0.45,
      metalness: 0.04,
    });
    const whiteAccentMat = new THREE.MeshStandardMaterial({
      color: 0x9e8d74,
      roughness: 0.58,
      metalness: 0.16,
    });
    const blackBodyMat = new THREE.MeshStandardMaterial({
      color: 0x26241f,
      roughness: 0.38,
      metalness: 0.12,
    });
    const blackAccentMat = new THREE.MeshStandardMaterial({
      color: 0x8f8370,
      roughness: 0.65,
      metalness: 0.32,
    });

    const shadowDiscGeo = new THREE.CircleGeometry(0.42, 16);
    const shadowDiscMat = new THREE.MeshBasicMaterial({
      map: contactTex,
      transparent: true,
      depthWrite: false,
    });

    const piecesGroup = new THREE.Group();
    scene.add(piecesGroup);

    // Camera transition state
    let cameraTargetPos: THREE.Vector3 | null = null;
    let frameId = 0;
    let timeoutId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      if (!sync) {
        timeoutId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          timeoutId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          timeoutId = window.setTimeout(cb, 80);
        }
      };
      timeoutId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const now = performance.now();
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;

        if (cameraTargetPos) {
          const alpha = 1 - Math.exp(-8 * dt);
          camera.position.lerp(cameraTargetPos, alpha);
          if (camera.position.distanceTo(cameraTargetPos) < 0.05) {
            camera.position.copy(cameraTargetPos);
            cameraTargetPos = null;
          } else {
            renderDirty = true;
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          if (disposed) return;
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    function syncBoard() {
      const { fen: curFen, boardTheme: curTheme, selectedSquare: selSq, lastMove: lm, highlightLegalMoves: showLegal } =
        propsRef.current;

      const theme = BOARD_THEMES[curTheme] ?? BOARD_THEMES.ivory;
      lightSquareMat.color.set(theme.lightSquare);
      darkSquareMat.color.set(theme.darkSquare);

      // Update square materials
      for (const mesh of squareMeshes) {
        const sq = mesh.userData.square as Square;
        const isLight = mesh.userData.isLight as boolean;
        if (selSq === sq) {
          mesh.material = highlightSelectMat;
        } else if (lm && (lm.from === sq || lm.to === sq)) {
          mesh.material = highlightLastMat;
        } else {
          mesh.material = isLight ? lightSquareMat : darkSquareMat;
        }
      }

      // Rebuild pieces
      while (piecesGroup.children.length > 0) {
        piecesGroup.remove(piecesGroup.children[0]);
      }

      let curChess: Chess;
      try {
        curChess = new Chess(curFen);
      } catch {
        curChess = new Chess();
      }

      const board = curChess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const cell = board[r][c];
          if (!cell) continue;
          const isWhite = cell.color === 'w';
          const pieceMesh = buildGeoPieceMesh(
            cell.type,
            isWhite ? whiteBodyMat : blackBodyMat,
            isWhite ? whiteAccentMat : blackAccentMat,
            shadowDiscGeo,
            shadowDiscMat,
            !isSoftwareGl,
          );
          pieceMesh.position.set(c - 3.5, 0.14, r - 3.5);
          if (!isWhite && cell.type === 'n') {
            pieceMesh.rotation.y = Math.PI;
          }
          pieceMesh.userData = { square: `${FILES[c]}${8 - r}` };
          piecesGroup.add(pieceMesh);
        }
      }

      // Legal move indicators
      while (legalIndicatorGroup.children.length > 0) {
        legalIndicatorGroup.remove(legalIndicatorGroup.children[0]);
      }
      if (selSq && showLegal) {
        const legal = curChess.moves({ square: selSq, verbose: true }) as Move[];
        for (const mv of legal) {
          const fileIdx = mv.to.charCodeAt(0) - 97;
          const rankIdx = 8 - parseInt(mv.to[1], 10);
          if (mv.captured) {
            const ring = new THREE.Mesh(ringGeo, dotMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(fileIdx - 3.5, 0.148, rankIdx - 3.5);
            legalIndicatorGroup.add(ring);
          } else {
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.set(fileIdx - 3.5, 0.15, rankIdx - 3.5);
            legalIndicatorGroup.add(dot);
          }
        }
      }

      requestRender();
    }

    sceneSyncRef.current = {
      syncBoard,
      setCameraPreset: (preset) => {
        if (preset === 'white') cameraTargetPos = new THREE.Vector3(0, 7.6, 8.2);
        else if (preset === 'black') cameraTargetPos = new THREE.Vector3(0, 7.6, -8.2);
        else if (preset === 'iso') cameraTargetPos = new THREE.Vector3(6.8, 7.2, 6.8);
        else cameraTargetPos = new THREE.Vector3(0, 11.2, 0.4);
        requestRender();
      },
      zoomCamera: (factor) => {
        cameraTargetPos = null;
        const len = camera.position.length();
        const nextLen = THREE.MathUtils.clamp(len * factor, 6.5, 17);
        camera.position.setLength(nextLen);
        requestRender();
      },
    };

    // Raycast click handler (only triggers when pointer did not orbit-drag)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 6) return; // User dragged camera

      const { interactive: isInter, fen: curFen, playerColor: pCol, selectedSquare: selSq, onMove: moveCb } =
        propsRef.current;
      if (!isInter) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObjects([...squareMeshes, ...piecesGroup.children], true);
      if (hits.length === 0) {
        setSelectedSquare(null);
        return;
      }

      let hitObj: THREE.Object3D | null = hits[0].object;
      let clickedSquare: Square | undefined;
      while (hitObj) {
        if (hitObj.userData?.square) {
          clickedSquare = hitObj.userData.square as Square;
          break;
        }
        hitObj = hitObj.parent;
      }
      if (!clickedSquare) return;

      const curChess = new Chess(curFen);
      const turn = curChess.turn();

      if (selSq) {
        if (selSq === clickedSquare) {
          setSelectedSquare(null);
          return;
        }
        const legal = curChess.moves({ square: selSq, verbose: true }) as Move[];
        const matched = legal.find((m) => m.to === clickedSquare);
        if (matched) {
          if (matched.promotion) {
            setPendingPromotion({ from: selSq, to: clickedSquare });
            return;
          }
          moveCb?.(selSq, clickedSquare);
          setSelectedSquare(null);
          return;
        }
      }

      const piece = curChess.get(clickedSquare);
      const allowed = pCol === 'both' ? piece?.color === turn : piece?.color === pCol && piece?.color === turn;
      if (piece && allowed) {
        setSelectedSquare(clickedSquare);
      } else {
        setSelectedSquare(null);
      }
    };

    const onControlsStart = () => {
      cameraTargetPos = null;
    };
    const onControlsChange = () => requestRender();

    controls.addEventListener('start', onControlsStart);
    controls.addEventListener('change', onControlsChange);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth || 540;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    syncBoard();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('change', onControlsChange);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      bumpTex.dispose();
      contactTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Re-sync board whenever FEN, theme, selection, or highlights change
  useEffect(() => {
    sceneSyncRef.current?.syncBoard();
  }, [fen, boardTheme, selectedSquare, lastMove, highlightLegalMoves]);

  // Smoothly re-orient camera when orientation flips
  useEffect(() => {
    sceneSyncRef.current?.setCameraPreset(orientation === 'w' ? 'white' : 'black');
  }, [orientation]);

  if (webglError) {
    return (
      <div className="w-full aspect-square flex items-center justify-center border border-[#D8CDBB] dark:border-[#3B362E] rounded-md bg-[#EAE2D4] dark:bg-[#23201B] p-6 text-center text-sm text-[#756F63]">
        {webglError} Switch back to 2D mode to continue playing.
      </div>
    );
  }

  return (
    <div
      className="relative w-full mx-auto"
      style={{ maxWidth: `${maxSizePx}px` }}
      data-testid="chessboard-3d"
    >
      <div
        ref={mountRef}
        className="w-full aspect-square rounded-[6px] overflow-hidden border border-[#D8CDBB] dark:border-[#3B362E] bg-[#E8DFCF]"
      />

      {/* Solid bottom-docked 3D camera controls (no backdrop-filter over WebGL) */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[#756F63] dark:text-[#9B9386] mr-1">Camera:</span>
          <button
            type="button"
            onClick={() => sceneSyncRef.current?.setCameraPreset('white')}
            className="px-2 py-1 rounded bg-[#EAE2D4] dark:bg-[#2B2822] hover:bg-[#DFD5C3] dark:hover:bg-[#3A352D] text-[#292720] dark:text-[#F3EBDD]"
          >
            White
          </button>
          <button
            type="button"
            onClick={() => sceneSyncRef.current?.setCameraPreset('black')}
            className="px-2 py-1 rounded bg-[#EAE2D4] dark:bg-[#2B2822] hover:bg-[#DFD5C3] dark:hover:bg-[#3A352D] text-[#292720] dark:text-[#F3EBDD]"
          >
            Black
          </button>
          <button
            type="button"
            onClick={() => sceneSyncRef.current?.setCameraPreset('iso')}
            className="px-2 py-1 rounded bg-[#EAE2D4] dark:bg-[#2B2822] hover:bg-[#DFD5C3] dark:hover:bg-[#3A352D] text-[#292720] dark:text-[#F3EBDD]"
          >
            Isometric
          </button>
          <button
            type="button"
            onClick={() => sceneSyncRef.current?.setCameraPreset('top')}
            className="px-2 py-1 rounded bg-[#EAE2D4] dark:bg-[#2B2822] hover:bg-[#DFD5C3] dark:hover:bg-[#3A352D] text-[#292720] dark:text-[#F3EBDD]"
          >
            Top
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom in 3D board"
            onClick={() => sceneSyncRef.current?.zoomCamera(0.85)}
            className="p-1.5 rounded bg-[#EAE2D4] dark:bg-[#2B2822] hover:bg-[#DFD5C3] text-[#292720] dark:text-[#F3EBDD]"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Zoom out 3D board"
            onClick={() => sceneSyncRef.current?.zoomCamera(1.18)}
            className="p-1.5 rounded bg-[#EAE2D4] dark:bg-[#2B2822] hover:bg-[#DFD5C3] text-[#292720] dark:text-[#F3EBDD]"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Reset 3D camera"
            onClick={() => sceneSyncRef.current?.setCameraPreset(orientation === 'w' ? 'white' : 'black')}
            className="p-1.5 rounded bg-[#EAE2D4] dark:bg-[#2B2822] hover:bg-[#DFD5C3] text-[#292720] dark:text-[#F3EBDD]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Promotion selector */}
      {pendingPromotion && (
        <div className="mt-2 p-2.5 rounded-md border border-[#D8CDBB] bg-[#FFFFFF] flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#292720]">Choose promotion piece ({chess.turn() === 'w' ? 'White' : 'Black'}):</span>
          <div className="flex items-center gap-1.5">
            {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  onMove?.(pendingPromotion.from, pendingPromotion.to, p);
                  setPendingPromotion(null);
                  setSelectedSquare(null);
                }}
                className="px-2.5 py-1 text-xs font-mono font-semibold uppercase rounded border border-[#D8CDBB] bg-[#F3EBDD] hover:bg-[#EAE2D4]"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chessboard3D;
