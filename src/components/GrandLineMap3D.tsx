import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Lock,
  MapPin,
  Maximize2,
  Play,
  Unlock,
  X,
} from 'lucide-react';
import { CHAPTERS, MISSIONS } from '../data/campaign';
import {
  createAllIslandStructures,
  createArchipelagoFoliageAndRocks,
  createArchipelagoTerrainMesh,
  createDepthOceanMesh,
  createLockedIslandOverlay,
  createMissionBeacon,
  createParchmentLabelSprite,
  createPirateGalleon,
  createStoneBumpTexture,
} from './grandline/proceduralModels';
import {
  ARCHIPELAGO_SITES,
  getWorldHeight,
  PIRATE_SAILING_WAYPOINTS,
} from './grandline/terrainMath';

interface GrandLineMap3DProps {
  currentMissionId: number;
  completedMissions: number[];
  highestUnlockedId: number;
  exploreAllUnlocked: boolean;
  onToggleExploreAll: () => void;
  onSelectMission: (missionId: number) => void;
  onClose: () => void;
}

interface IslandAnchor {
  chapterId: number;
  labelTitle: string;
  labelY: number;
  pos: [number, number, number];
  camOffset: [number, number, number];
}

const CHAPTER_SITES = ARCHIPELAGO_SITES.filter((s) => s.chapterId !== undefined);

const ISLAND_ANCHORS: IslandAnchor[] = [
  {
    chapterId: 1,
    labelTitle: 'Pulau Aturan',
    labelY: 5.1,
    pos: [-18.5, 0, 5.5],
    camOffset: [0, 9.2, 13.5],
  },
  {
    chapterId: 2,
    labelTitle: 'Galangan Beku',
    labelY: 6.4,
    pos: [-7.5, 0, -6.5],
    camOffset: [0, 9.8, 14.0],
  },
  {
    chapterId: 3,
    labelTitle: 'Pulau Langit',
    labelY: 6.7,
    pos: [2.0, 0, 3.0],
    camOffset: [0, 10.2, 14.2],
  },
  {
    chapterId: 4,
    labelTitle: 'Kepulauan Harta',
    labelY: 5.4,
    pos: [13.0, 0, -5.5],
    camOffset: [0, 9.5, 13.8],
  },
  {
    chapterId: 5,
    labelTitle: 'Benteng Aurelius',
    labelY: 7.1,
    pos: [24.5, 0, 2.5],
    camOffset: [0, 10.6, 15.2],
  },
];

const OVERVIEW_CAM = new THREE.Vector3(-1.5, 30, 42);
const OVERVIEW_TARGET = new THREE.Vector3(1.5, 0.5, 0.5);

// Pre-allocated scratch math helpers outside loop (zero GC)
const _targetCamPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _rayMouse = new THREE.Vector2();
const _shipPos = new THREE.Vector3();
const _shipTan = new THREE.Vector3();
const _birdDummy = new THREE.Object3D();

export function GrandLineMap3D({
  currentMissionId,
  completedMissions,
  highestUnlockedId,
  exploreAllUnlocked,
  onToggleExploreAll,
  onSelectMission,
  onClose,
}: GrandLineMap3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const currentMissionObj =
    MISSIONS.find((m) => m.id === currentMissionId) || MISSIONS[0];

  const [focusedChapterId, setFocusedChapterId] = useState<number>(
    currentMissionObj.chapterId
  );
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [hoveredChapter, setHoveredChapter] = useState<number | null>(null);

  // Refs synced cleanly for raycasting inside WebGL callbacks
  const stateRef = useRef({
    focusedChapterId: currentMissionObj.chapterId,
    highestUnlockedId,
    exploreAllUnlocked,
    currentMissionId,
  });
  stateRef.current = {
    focusedChapterId,
    highestUnlockedId,
    exploreAllUnlocked,
    currentMissionId,
  };

  const callbacksRef = useRef({ onSelectMission, onClose });
  callbacksRef.current = { onSelectMission, onClose };

  const cameraGoalRef = useRef<{
    active: boolean;
    camPos: THREE.Vector3;
    lookAt: THREE.Vector3;
  }>({
    active: false,
    camPos: OVERVIEW_CAM.clone(),
    lookAt: OVERVIEW_TARGET.clone(),
  });

  const beaconMeshesRef = useRef<
    Array<{ missionId: number; crystal: THREE.Mesh }>
  >([]);
  const lockOverlaysRef = useRef<
    Array<{ chapterId: number; group: THREE.Group }>
  >([]);

  const focusChapterIn3D = (chapterId: number | 'overview') => {
    if (chapterId === 'overview') {
      cameraGoalRef.current.camPos.copy(OVERVIEW_CAM);
      cameraGoalRef.current.lookAt.copy(OVERVIEW_TARGET);
      cameraGoalRef.current.active = true;
      return;
    }
    setFocusedChapterId(chapterId);
    const anchor = ISLAND_ANCHORS.find((a) => a.chapterId === chapterId);
    if (!anchor) return;
    cameraGoalRef.current.lookAt.set(anchor.pos[0], 1.4, anchor.pos[2]);
    cameraGoalRef.current.camPos.set(
      anchor.pos[0] + anchor.camOffset[0],
      anchor.camOffset[1],
      anchor.pos[2] + anchor.camOffset[2]
    );
    cameraGoalRef.current.active = true;
  };

  const enterChapter = (chapterId: number) => {
    const { exploreAllUnlocked: free, highestUnlockedId: maxId, currentMissionId: curId } =
      stateRef.current;
    const chMissions = MISSIONS.filter((m) => m.chapterId === chapterId);
    const unlockedInCh = chMissions.filter((m) => free || m.id <= maxId);
    if (unlockedInCh.length === 0) return;
    const preferred =
      unlockedInCh.find((m) => m.id === curId) || unlockedInCh[0];
    callbacksRef.current.onSelectMission(preferred.id);
    callbacksRef.current.onClose();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Sunlit Airy Tropical Miniature World Atmosphere
    const scene = new THREE.Scene();
    const skyMist = new THREE.Color(0x9bc7dd);
    scene.background = skyMist;
    scene.fog = new THREE.FogExp2(0x9bc7dd, 0.0085);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 220);
    camera.position.copy(OVERVIEW_CAM);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(OVERVIEW_TARGET);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.3;
    controls.minPolarAngle = Math.PI / 9;
    controls.minDistance = 8;
    controls.maxDistance = 62;
    controls.update();

    controls.addEventListener('start', () => {
      cameraGoalRef.current.active = false;
    });

    // Golden-Hour Sunlit Diorama Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xd9f2ff, 0x16425b, 1.05);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff0cc, 2.35);
    keyLight.position.set(22, 34, 18);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -38;
    keyLight.shadow.camera.right = 38;
    keyLight.shadow.camera.top = 28;
    keyLight.shadow.camera.bottom = -28;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.75);
    rimLight.position.set(-24, 14, -22);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const bumpTex = createStoneBumpTexture();

    // 1. Sculpted Archipelago Seafloor + Sandy Beaches + Lush Hills + Mountain Peaks
    const { mesh: terrainMesh, terrainTex } = createArchipelagoTerrainMesh(
      bumpTex,
      maxAniso
    );
    scene.add(terrainMesh);

    // 2. Translucent Depth-Graded Animated Ocean Water
    const {
      mesh: oceanMesh,
      oceanTex,
      waveUniforms,
    } = createDepthOceanMesh(maxAniso);
    scene.add(oceanMesh);

    // 3. Instanced Tropical Palms, Alpine Pines, and Coastal Sea Rocks
    const foliageAndRocks = createArchipelagoFoliageAndRocks(bumpTex);
    scene.add(foliageAndRocks);

    // 4. Island Landmarks, Animated Lighthouse, Crane, Floating Sky Island, Citadel, Boats & Seabirds
    const { group: structuresGroup, envRefs } = createAllIslandStructures();
    scene.add(structuresGroup);

    // 5. Reverse Mountain Banner + 5 Chapter Parchment Scroll Labels + Hit Proxies
    const revLabel = createParchmentLabelSprite('Reverse Mountain', 'GERBANG BARAT');
    revLabel.position.set(-29.0, 8.2, 3.5);
    scene.add(revLabel);

    const clickables: THREE.Object3D[] = [];
    ISLAND_ANCHORS.forEach((anchor) => {
      const scroll = createParchmentLabelSprite(
        anchor.labelTitle,
        `CHAPTER ${anchor.chapterId}`
      );
      scroll.position.set(anchor.pos[0], anchor.labelY, anchor.pos[2]);
      scene.add(scroll);

      const hitProxy = new THREE.Mesh(
        new THREE.CylinderGeometry(5.2, 5.2, 5.5, 10),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitProxy.position.set(anchor.pos[0], 2.2, anchor.pos[2]);
      hitProxy.userData.chapterId = anchor.chapterId;
      scene.add(hitProxy);
      clickables.push(hitProxy);
    });

    // 6. Locked Island Storm Cloud & Padlock Overlays
    lockOverlaysRef.current = [];
    CHAPTER_SITES.forEach((site) => {
      if (!site.chapterId) return;
      const anchor = ISLAND_ANCHORS.find((a) => a.chapterId === site.chapterId);
      const lockGroup = createLockedIslandOverlay(
        site,
        anchor ? anchor.labelY : site.peakHeight + 1.5
      );
      const chapterMissions = MISSIONS.filter((m) => m.chapterId === site.chapterId);
      const minId = Math.min(...chapterMissions.map((m) => m.id));
      lockGroup.visible = !exploreAllUnlocked && minId > highestUnlockedId;
      scene.add(lockGroup);
      lockOverlaysRef.current.push({ chapterId: site.chapterId, group: lockGroup });
    });

    // 7. 12 Interactive Mission Beacons grounded along coastlines
    const beacons: THREE.Group[] = [];
    beaconMeshesRef.current = [];
    MISSIONS.forEach((m) => {
      const anchor = ISLAND_ANCHORS.find((a) => a.chapterId === m.chapterId)!;
      const chapterMissions = MISSIONS.filter((cm) => cm.chapterId === m.chapterId);
      const localIdx = chapterMissions.findIndex((cm) => cm.id === m.id);
      const angle =
        (localIdx / Math.max(1, chapterMissions.length)) * Math.PI * 0.9 + 0.3;
      const radius = m.chapterId === 5 ? 5.4 : 4.7;

      const isCompleted = completedMissions.includes(m.id);
      const isActive = m.id === currentMissionId;
      const isUnlocked = exploreAllUnlocked || m.id <= highestUnlockedId;
      const status = isCompleted
        ? 'completed'
        : isActive
        ? 'active'
        : isUnlocked
        ? 'unlocked'
        : 'locked';

      const bx = anchor.pos[0] + Math.cos(angle) * radius;
      const bz = anchor.pos[2] + Math.sin(angle) * radius;
      const by = Math.max(0.05, getWorldHeight(bx, bz) + 0.02);

      const beacon = createMissionBeacon(status);
      beacon.position.set(bx, by, bz);
      beacon.userData.chapterId = m.chapterId;
      beacon.userData.missionId = m.id;
      scene.add(beacon);
      beacons.push(beacon);

      const crystal = beacon.children[2] as THREE.Mesh | undefined;
      if (crystal) {
        beaconMeshesRef.current.push({ missionId: m.id, crystal });
      }

      const bHit = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      bHit.position.set(beacon.position.x, 0.7, beacon.position.z);
      bHit.userData.chapterId = m.chapterId;
      bHit.userData.missionId = m.id;
      scene.add(bHit);
      clickables.push(bHit);
    });

    // 8. Continuous Closed-Loop Sailing Route for Hero Pirate Galleon
    const sailingCurve = new THREE.CatmullRomCurve3(
      PIRATE_SAILING_WAYPOINTS.map(([wx, wz]) => new THREE.Vector3(wx, 0.14, wz)),
      true
    );
    const galleon = createPirateGalleon();
    scene.add(galleon);

    // Raycasting Interaction (Hover + Click Island/Beacon)
    const raycaster = new THREE.Raycaster();
    let pointerDownX = 0;
    let pointerDownY = 0;
    let lastHoverTs = 0;

    const onPointerDown = (e: PointerEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY) > 6) {
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(clickables, false);
      if (hits.length > 0) {
        const hitData = hits[0].object.userData;
        const mId = hitData.missionId as number | undefined;
        const chId = hitData.chapterId as number | undefined;

        if (mId) {
          const isUnlocked =
            stateRef.current.exploreAllUnlocked ||
            mId <= stateRef.current.highestUnlockedId;
          if (isUnlocked) {
            callbacksRef.current.onSelectMission(mId);
            callbacksRef.current.onClose();
            return;
          }
        }

        if (chId) {
          const wasFocused = stateRef.current.focusedChapterId === chId;
          focusChapterIn3D(chId);
          setDockCollapsed(false);
          if (wasFocused) {
            enterChapter(chId);
          }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTs < 60) return;
      lastHoverTs = now;
      const rect = renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(clickables, false);
      if (hits.length > 0) {
        const chId = hits[0].object.userData.chapterId as number;
        setHoveredChapter(chId);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredChapter(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let disposed = false;
    let frameId = 0;
    const startMs = performance.now();
    let lastMs = startMs;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const nowMs = performance.now();
      const rawDt = (nowMs - lastMs) / 1000;
      lastMs = nowMs;
      const delta = Math.min(Math.max(rawDt, 0.001), 0.12);
      const elapsed = (nowMs - startMs) / 1000;

      waveUniforms.uTime.value = elapsed;

      // Hero Pirate Galleon actively sails along the Grand Line ocean channels
      const shipT = (elapsed * 0.022) % 1;
      sailingCurve.getPointAt(shipT, _shipPos);
      sailingCurve.getTangentAt(shipT, _shipTan);
      const bob = Math.sin(elapsed * 2.0) * 0.07;
      galleon.position.set(_shipPos.x, 0.14 + bob, _shipPos.z);
      galleon.rotation.y = Math.atan2(-_shipTan.x, -_shipTan.z);
      galleon.rotation.z = Math.sin(elapsed * 1.4) * 0.045;
      galleon.rotation.x = Math.cos(elapsed * 1.2) * 0.03;

      // Ambient Harbor Sailboats cruising coves
      envRefs.ambientBoats.forEach((b) => {
        const ang = elapsed * b.speed + b.phase;
        b.mesh.position.set(
          b.cx + Math.cos(ang) * b.r,
          0.08 + Math.sin(elapsed * 2.1 + b.phase) * 0.03,
          b.cz + Math.sin(ang) * b.r
        );
        b.mesh.rotation.y = -ang + (b.speed >= 0 ? Math.PI : 0);
      });

      // Circling Seabirds above islands (InstancedMesh, zero GC)
      envRefs.birdSeeds.forEach((bs, idx) => {
        const ang = elapsed * bs.speed + bs.phase;
        _birdDummy.position.set(
          bs.cx + Math.cos(ang) * bs.r,
          bs.y + Math.sin(elapsed * 1.8 + bs.phase) * 0.25,
          bs.cz + Math.sin(ang) * bs.r
        );
        _birdDummy.rotation.set(0, -ang, Math.sin(elapsed * 5 + idx) * 0.18);
        _birdDummy.scale.setScalar(1);
        _birdDummy.updateMatrix();
        envRefs.birdsInst.setMatrixAt(idx, _birdDummy.matrix);
      });
      envRefs.birdsInst.instanceMatrix.needsUpdate = true;

      // Island Landmark Environmental Animations
      if (envRefs.lighthouseBeam) {
        envRefs.lighthouseBeam.rotation.y = elapsed * 0.85;
      }
      if (envRefs.craneArm) {
        envRefs.craneArm.rotation.y = Math.sin(elapsed * 0.65) * 0.45;
      }
      if (envRefs.floatingSky) {
        envRefs.floatingSky.position.y = 3.85 + Math.sin(elapsed * 1.15) * 0.16;
      }
      if (envRefs.treasureCrystal) {
        envRefs.treasureCrystal.rotation.y = elapsed * 1.1;
      }

      // Subtle Locked Island Storm & Padlock float
      lockOverlaysRef.current.forEach(({ group: lg }, idx) => {
        if (lg.visible) {
          lg.rotation.y = elapsed * 0.22 + idx;
        }
      });

      beacons.forEach((b, idx) => {
        const crystal = b.children[2];
        if (crystal) {
          crystal.rotation.y = elapsed * 0.9 + idx * 0.6;
        }
      });

      // Smooth damped camera preset choreography
      if (cameraGoalRef.current.active) {
        _targetCamPos.copy(cameraGoalRef.current.camPos);
        _targetLook.copy(cameraGoalRef.current.lookAt);
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _targetCamPos.x,
          8.5,
          delta
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _targetCamPos.y,
          8.5,
          delta
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _targetCamPos.z,
          8.5,
          delta
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          _targetLook.x,
          9.0,
          delta
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          _targetLook.y,
          9.0,
          delta
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          _targetLook.z,
          9.0,
          delta
        );

        if (
          camera.position.distanceTo(_targetCamPos) < 0.08 &&
          controls.target.distanceTo(_targetLook) < 0.08
        ) {
          cameraGoalRef.current.active = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      controls.dispose();
      terrainTex.dispose();
      oceanTex.dispose();
      bumpTex.dispose();
      envTexture.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Sprite).isSprite) {
          const sp = obj as THREE.Sprite;
          sp.material.map?.dispose();
          sp.material.dispose();
        } else if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material.dispose();
          }
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update locked island shrouds & beacon colors cleanly without resetting WebGL
  useEffect(() => {
    const colorMap = {
      completed: 0x2a9d8f,
      active: 0xf4c456,
      unlocked: 0x67b7dc,
      locked: 0x4b5c6e,
    };
    const emissiveMap = {
      completed: 0x155d54,
      active: 0xd48806,
      unlocked: 0x1d4e6b,
      locked: 0x000000,
    };

    beaconMeshesRef.current.forEach(({ missionId, crystal }) => {
      const isCompleted = completedMissions.includes(missionId);
      const isActive = missionId === currentMissionId;
      const isUnlocked = exploreAllUnlocked || missionId <= highestUnlockedId;
      const status = isCompleted
        ? 'completed'
        : isActive
        ? 'active'
        : isUnlocked
        ? 'unlocked'
        : 'locked';

      const mat = crystal.material as THREE.MeshStandardMaterial;
      mat.color.setHex(colorMap[status]);
      mat.emissive.setHex(emissiveMap[status]);
      mat.emissiveIntensity =
        status === 'active' ? 1.4 : status === 'locked' ? 0 : 0.7;
    });

    lockOverlaysRef.current.forEach(({ chapterId, group }) => {
      const chMissions = MISSIONS.filter((m) => m.chapterId === chapterId);
      const minId = Math.min(...chMissions.map((m) => m.id));
      group.visible = !exploreAllUnlocked && minId > highestUnlockedId;
    });
  }, [currentMissionId, completedMissions, highestUnlockedId, exploreAllUnlocked]);

  const activeChapter =
    CHAPTERS.find((c) => c.id === focusedChapterId) || CHAPTERS[0];
  const chapterMissions = MISSIONS.filter(
    (m) => m.chapterId === activeChapter.id
  );
  const isFocusedChapterUnlocked = chapterMissions.some(
    (m) => exploreAllUnlocked || m.id <= highestUnlockedId
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-[#9BC7DD] overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grandline-map-title"
    >
      {/* Isolated WebGL Canvas Mount */}
      <div
        ref={mountRef}
        data-testid="grandline-3d-canvas"
        className="w-full h-full"
      />

      {/* Top-Left Weathered Parchment Crest + Top-Right Compact Controls */}
      <div className="pointer-events-none fixed top-4 left-4 right-4 flex items-start justify-between gap-4">
        <div className="pointer-events-auto bg-[#F0DFB7] border-2 border-[#784E24] rounded-xl px-4 py-2.5 shadow-2xl max-w-md text-[#2B1608]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2B1608] flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4 text-[#F4C456]" aria-hidden="true" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B3A1D]">
                THE LAST PIRATE · 5 CHAPTER · 12 MISI
              </div>
              <h2
                id="grandline-map-title"
                className="font-display text-sm md:text-base font-bold text-[#241206] leading-tight"
              >
                Peta Dunia Grand Line 3D
              </h2>
              <p className="text-[11px] text-[#5C3A1C]">
                Seret putar · Gulir zoom · Klik pulau untuk fokus / masuk
              </p>
            </div>
          </div>
          {hoveredChapter !== null && (
            <div className="mt-2 pt-1.5 border-t border-[#B89056] text-xs font-bold text-[#7C2D12] flex items-center justify-between gap-2">
              <span>{CHAPTERS.find((c) => c.id === hoveredChapter)?.title}</span>
              {!exploreAllUnlocked &&
                MISSIONS.filter((m) => m.chapterId === hoveredChapter).every(
                  (m) => m.id > highestUnlockedId
                ) && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#991B1B]">
                    <Lock className="w-3 h-3" aria-hidden="true" />
                    Terkunci
                  </span>
                )}
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => focusChapterIn3D('overview')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B1726]/92 hover:bg-[#13263B] border border-[#D49A2A]/50 text-xs font-medium text-[#F4EBD9] cursor-pointer whitespace-nowrap shadow-lg"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#D49A2A]" aria-hidden="true" />
            <span className="hidden sm:inline">Tampilan Penuh</span>
          </button>

          <button
            type="button"
            onClick={onToggleExploreAll}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shadow-lg ${
              exploreAllUnlocked
                ? 'bg-[#123332]/95 border-[#2A9D8F] text-[#9CF0E4]'
                : 'bg-[#0B1726]/92 border-[#D49A2A]/50 text-[#F4EBD9] hover:border-[#D49A2A]'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
            {exploreAllUnlocked ? 'Mode Bebas Aktif' : 'Buka Semua Misi'}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Peta Pelayaran"
            className="w-9 h-9 rounded-lg bg-[#0B1726]/92 hover:bg-[#1A334F] border border-[#D49A2A]/50 flex items-center justify-center text-[#F4EBD9] cursor-pointer shadow-lg"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Collapsible Bottom Dock (Unified Chapter + Mission Selector) */}
      <div
        className="pointer-events-none fixed bottom-4 inset-x-0 flex flex-col items-center px-3 transition-transform duration-200"
        style={{
          transform: dockCollapsed
            ? 'translateY(calc(100% - 36px))'
            : 'translateY(0)',
        }}
      >
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-t-lg bg-[#0B1726]/95 border border-b-0 border-[#D49A2A]/50 text-[11px] font-medium text-[#F4EBD9] hover:text-[#F4C456] cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              Tampilkan Misi Grand Line
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              Sembunyikan Panel
            </>
          )}
        </button>

        <div className="pointer-events-auto w-full max-w-[900px] bg-[#0B1726]/95 border border-[#D49A2A]/45 rounded-xl p-3.5 shadow-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {CHAPTERS.map((ch) => {
              const isFocused = ch.id === activeChapter.id;
              const chUnlocked = MISSIONS.filter(
                (m) => m.chapterId === ch.id
              ).some((m) => exploreAllUnlocked || m.id <= highestUnlockedId);
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => focusChapterIn3D(ch.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isFocused
                      ? 'bg-[#D49A2A] text-[#0B1726] font-bold'
                      : chUnlocked
                      ? 'bg-[#13263B] text-[#C8D4E3] hover:bg-[#1B3552]'
                      : 'bg-[#0D1A2B] text-[#6E839B] hover:bg-[#14253B]'
                  }`}
                >
                  {!chUnlocked && (
                    <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />
                  )}
                  Chapter {ch.id}
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-2.5">
              <span className="hidden md:inline text-xs text-[#9FB0C4] truncate">
                {activeChapter.title}
              </span>
              {isFocusedChapterUnlocked ? (
                <button
                  type="button"
                  onClick={() => enterChapter(activeChapter.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A9D8F] hover:bg-[#34B5A5] text-[#071917] font-bold text-xs cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                  Masuk Chapter {activeChapter.id}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2B1416] border border-[#7F1D1D] text-[11px] font-medium text-[#FCA5A5] whitespace-nowrap">
                  <Lock className="w-3 h-3" aria-hidden="true" />
                  Pulau Terkunci
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {chapterMissions.map((mission) => {
              const isCompleted = completedMissions.includes(mission.id);
              const isCurrent = mission.id === currentMissionId;
              const isUnlocked =
                exploreAllUnlocked || mission.id <= highestUnlockedId;

              return (
                <button
                  key={mission.id}
                  type="button"
                  disabled={!isUnlocked}
                  onClick={() => {
                    onSelectMission(mission.id);
                    onClose();
                  }}
                  className={`text-left p-3 rounded-lg border transition-colors flex flex-col justify-between gap-1.5 ${
                    !isUnlocked
                      ? 'bg-[#09131F] border-[#1A2F47] text-[#60768F] cursor-not-allowed'
                      : isCurrent
                      ? 'bg-[#17314F] border-[#D49A2A] text-[#F4EBD9] cursor-pointer'
                      : 'bg-[#12253B] border-[#253F5C] hover:border-[#D49A2A]/70 text-[#F4EBD9] cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-xs leading-snug">
                      {mission.title}
                    </span>
                    {isCompleted ? (
                      <CheckCircle2
                        className="w-4 h-4 text-[#2A9D8F] shrink-0"
                        aria-hidden="true"
                      />
                    ) : isCurrent ? (
                      <MapPin
                        className="w-4 h-4 text-[#D49A2A] shrink-0"
                        aria-hidden="true"
                      />
                    ) : !isUnlocked ? (
                      <Lock
                        className="w-4 h-4 text-[#60768F] shrink-0"
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-math">
                    <span
                      className={
                        isCompleted ? 'text-[#9CF0E4]' : 'text-[#8FA4BC]'
                      }
                    >
                      {isCompleted
                        ? 'Selesai'
                        : isCurrent
                        ? 'Aktif'
                        : isUnlocked
                        ? 'Tersedia'
                        : 'Terkunci'}
                    </span>
                    <span className="text-[#D49A2A]">
                      +{mission.rewardCoins} Koin
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
