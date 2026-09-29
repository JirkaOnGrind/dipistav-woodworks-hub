import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { pergolaParts, ROOF_COLORS, WOOD_PAINTS, type PergolaConfig } from "@/lib/pergola";
import { boundsWithDimensionGuides, createDimensionGuides } from "./pergola-dimensions";

const CAMERA_DIRECTION = new THREE.Vector3(0.95, 0.65, 1.25).normalize();
const DEFAULT_CAMERA_FOV = 38;
const CAMERA_FLOOR_Y = 0;
const CAMERA_FLOOR_CLEARANCE = 0.01;
const CAMERA_SURFACE_CLEARANCE = 1.08;
const CAMERA_TARGET_DAMPING = 24;
const CAMERA_ORBIT_DAMPING = 32;
const CAMERA_ZOOM_DAMPING = 28;
const MIN_POLAR_ANGLE = 0.02;
const MAX_POLAR_ANGLE = Math.PI - MIN_POLAR_ANGLE;

function boundsCorners(bounds: THREE.Box3) {
  const corners: THREE.Vector3[] = [];
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) corners.push(new THREE.Vector3(x, y, z));
  return corners;
}

export function calculateCameraFit(
  bounds: THREE.Box3,
  aspect: number,
  frameFill: number | { x: number; y: number },
  cameraDirection = CAMERA_DIRECTION,
  targetOverride?: THREE.Vector3,
  fov = DEFAULT_CAMERA_FOV,
) {
  const target = targetOverride?.clone() ?? bounds.getCenter(new THREE.Vector3());
  const boundsSphere = bounds.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(boundsSphere.radius, 0.001);
  const safeAspect = Math.max(aspect, 0.01);
  const corners = boundsCorners(bounds);
  const fill =
    typeof frameFill === "number"
      ? { x: frameFill, y: frameFill }
      : { x: Math.max(frameFill.x, 0.01), y: Math.max(frameFill.y, 0.01) };
  const direction = cameraDirection.clone();
  if (direction.lengthSq() < 0.0001) direction.copy(CAMERA_DIRECTION);
  direction.normalize();
  const orientation = new THREE.Matrix4().lookAt(
    direction,
    new THREE.Vector3(),
    THREE.Object3D.DEFAULT_UP,
  );
  const right = new THREE.Vector3().setFromMatrixColumn(orientation, 0).normalize();
  const up = new THREE.Vector3().setFromMatrixColumn(orientation, 1).normalize();
  const tanVertical = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const tanHorizontal = tanVertical * safeAspect;
  let distance = 0;
  for (const corner of corners) {
    const relative = corner.clone().sub(target);
    const backwardDepth = relative.dot(direction);
    distance = Math.max(
      distance,
      Math.abs(relative.dot(right)) / (tanHorizontal * fill.x) + backwardDepth,
      Math.abs(relative.dot(up)) / (tanVertical * fill.y) + backwardDepth,
      backwardDepth + 0.01,
    );
  }
  distance = Math.max(distance * 1.01, radius * CAMERA_SURFACE_CLEARANCE);

  return { target, radius, distance, direction };
}

export function calculateCameraLimits(radius: number, fittedDistance: number) {
  const minDistance = Math.max(radius * CAMERA_SURFACE_CLEARANCE, radius + 0.05);
  const maxDistance = Math.max(fittedDistance * 3, minDistance * 2.5);
  return { minDistance, maxDistance };
}

export function calculateClippingPlanes(
  cameraDistance: number,
  maxDistance: number,
  boundsRadius: number,
  targetToBoundsCenter = 0,
) {
  const envelopeRadius = Math.max(boundsRadius + targetToBoundsCenter, 0.01);
  const clearance = Math.max(envelopeRadius * 0.12, 0.05);
  return {
    near: Math.max(0.01, cameraDistance - envelopeRadius - clearance),
    far: Math.max(cameraDistance, maxDistance) + envelopeRadius + clearance,
  };
}

export function floorSafePolarAngle(targetY: number, distance: number, floorY = CAMERA_FLOOR_Y) {
  if (distance <= 0.0001) return MIN_POLAR_ANGLE;
  const minimumCosine = (floorY + CAMERA_FLOOR_CLEARANCE - targetY) / distance;
  if (minimumCosine <= -1) return MAX_POLAR_ANGLE;
  return THREE.MathUtils.clamp(Math.acos(minimumCosine), MIN_POLAR_ANGLE, MAX_POLAR_ANGLE);
}

function dampAngle(current: number, target: number, damping: number, delta: number) {
  const difference =
    THREE.MathUtils.euclideanModulo(target - current + Math.PI, Math.PI * 2) - Math.PI;
  return current + difference * (1 - Math.exp(-damping * delta));
}

function createCameraRig(camera: THREE.PerspectiveCamera, element: HTMLElement) {
  const inputCamera = camera.clone();
  const controls = new OrbitControls(inputCamera, element);
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.enableDamping = false;
  controls.zoomToCursor = false;
  controls.minPolarAngle = MIN_POLAR_ANGLE;
  controls.maxPolarAngle = MAX_POLAR_ANGLE;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  element.style.touchAction = "none";
  element.style.overscrollBehavior = "none";

  const claimTouchPointer = (event: PointerEvent) => {
    if (event.pointerType !== "touch") return;
    if (event.cancelable) event.preventDefault();
    // OrbitControls tracks move/up on the owner document after pointer capture.
    // Only the initial contact can be isolated without cutting off that stream.
    if (event.type === "pointerdown") event.stopPropagation();
  };
  const claimNativeTouch = (event: TouchEvent) => {
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
  };
  element.addEventListener("pointerdown", claimTouchPointer);
  element.addEventListener("pointermove", claimTouchPointer);
  element.addEventListener("pointerup", claimTouchPointer);
  element.addEventListener("pointercancel", claimTouchPointer);
  element.addEventListener("touchstart", claimNativeTouch, { passive: false });
  element.addEventListener("touchmove", claimNativeTouch, { passive: false });
  element.addEventListener("touchend", claimNativeTouch, { passive: false });
  element.addEventListener("touchcancel", claimNativeTouch, { passive: false });

  const currentTarget = new THREE.Vector3();
  const desiredTarget = new THREE.Vector3();
  const currentOrbit = new THREE.Spherical();
  const desiredOrbit = new THREE.Spherical();
  const inputOffset = new THREE.Vector3();
  const renderOffset = new THREE.Vector3();
  const boundsSphere = new THREE.Sphere(new THREE.Vector3(), 0.001);
  let minDistance = 0.01;
  let maxDistance = 100;
  let initialized = false;

  const constrainOrbit = (orbit: THREE.Spherical, target: THREE.Vector3) => {
    orbit.radius = THREE.MathUtils.clamp(orbit.radius, minDistance, maxDistance);
    orbit.phi = THREE.MathUtils.clamp(
      orbit.phi,
      MIN_POLAR_ANGLE,
      floorSafePolarAngle(target.y, orbit.radius),
    );
    orbit.makeSafe();
  };

  const syncInputCamera = () => {
    constrainOrbit(desiredOrbit, desiredTarget);
    controls.minDistance = minDistance;
    controls.maxDistance = maxDistance;
    controls.maxPolarAngle = floorSafePolarAngle(desiredTarget.y, desiredOrbit.radius);
    controls.target.copy(desiredTarget);
    inputCamera.position.copy(desiredTarget).add(inputOffset.setFromSpherical(desiredOrbit));
    inputCamera.lookAt(desiredTarget);
  };

  const captureInput = () => {
    desiredOrbit.setFromVector3(inputOffset.copy(inputCamera.position).sub(controls.target));
    desiredTarget.copy(boundsSphere.center);
    constrainOrbit(desiredOrbit, desiredTarget);
    syncInputCamera();
  };
  controls.addEventListener("change", captureInput);

  const setBounds = (
    physicalBounds: THREE.Box3,
    framingBounds: THREE.Box3,
    aspect: number,
    frameFill: number | { x: number; y: number },
    canonicalDirection = false,
    canonicalCameraDirection = CAMERA_DIRECTION,
  ) => {
    physicalBounds.getBoundingSphere(boundsSphere);
    boundsSphere.radius = Math.max(boundsSphere.radius, 0.001);
    const direction =
      canonicalDirection || !initialized
        ? canonicalCameraDirection
        : inputOffset.setFromSpherical(desiredOrbit).normalize();
    const fit = calculateCameraFit(
      framingBounds,
      aspect,
      frameFill,
      direction,
      boundsSphere.center,
      camera.fov,
    );
    desiredTarget.copy(boundsSphere.center);
    desiredOrbit.setFromVector3(fit.direction.clone().multiplyScalar(fit.distance));
    ({ minDistance, maxDistance } = calculateCameraLimits(boundsSphere.radius, fit.distance));
    constrainOrbit(desiredOrbit, desiredTarget);
    if (!initialized) {
      currentTarget.copy(desiredTarget);
      currentOrbit.copy(desiredOrbit);
      initialized = true;
    }
    syncInputCamera();
  };

  const update = (delta: number) => {
    if (!initialized) return;
    const targetAlpha = 1 - Math.exp(-CAMERA_TARGET_DAMPING * delta);
    currentTarget.lerp(desiredTarget, targetAlpha);
    currentOrbit.theta = dampAngle(
      currentOrbit.theta,
      desiredOrbit.theta,
      CAMERA_ORBIT_DAMPING,
      delta,
    );
    currentOrbit.phi = THREE.MathUtils.damp(
      currentOrbit.phi,
      desiredOrbit.phi,
      CAMERA_ORBIT_DAMPING,
      delta,
    );
    currentOrbit.radius = THREE.MathUtils.damp(
      currentOrbit.radius,
      desiredOrbit.radius,
      CAMERA_ZOOM_DAMPING,
      delta,
    );

    // Collision constraints are projected after damping, still inside the frame update.
    constrainOrbit(currentOrbit, currentTarget);
    camera.position.copy(currentTarget).add(renderOffset.setFromSpherical(currentOrbit));
    camera.lookAt(currentTarget);
    camera.updateMatrixWorld(true);

    const targetOffset = currentTarget.distanceTo(boundsSphere.center);
    const clipping = calculateClippingPlanes(
      currentOrbit.radius,
      maxDistance,
      boundsSphere.radius,
      targetOffset,
    );
    if (camera.near !== clipping.near || camera.far !== clipping.far) {
      camera.near = clipping.near;
      camera.far = clipping.far;
      camera.updateProjectionMatrix();
    }
  };

  const command = (action: "reset" | "in" | "out" | "left" | "right" | "up" | "down") => {
    if (!initialized) return;
    if (action === "in" || action === "out") {
      desiredOrbit.radius *= action === "in" ? 0.85 : 1.15;
    } else if (action === "left" || action === "right") {
      desiredOrbit.theta += action === "left" ? -0.15 : 0.15;
    } else if (action === "up" || action === "down") {
      desiredOrbit.phi += action === "up" ? -0.12 : 0.12;
    }
    constrainOrbit(desiredOrbit, desiredTarget);
    syncInputCamera();
  };

  return {
    controls,
    setBounds,
    update,
    command,
    dispose() {
      controls.removeEventListener("change", captureInput);
      element.removeEventListener("pointerdown", claimTouchPointer);
      element.removeEventListener("pointermove", claimTouchPointer);
      element.removeEventListener("pointerup", claimTouchPointer);
      element.removeEventListener("pointercancel", claimTouchPointer);
      element.removeEventListener("touchstart", claimNativeTouch);
      element.removeEventListener("touchmove", claimNativeTouch);
      element.removeEventListener("touchend", claimNativeTouch);
      element.removeEventListener("touchcancel", claimNativeTouch);
      controls.dispose();
    },
  };
}

export function applyWoodFinish(
  material: THREE.MeshStandardMaterial,
  grain: THREE.Texture,
  finish: (typeof WOOD_PAINTS)[keyof typeof WOOD_PAINTS],
) {
  const nextMap = finish.category === "stains" ? grain : null;
  if (material.map !== nextMap) {
    material.map = nextMap;
    material.needsUpdate = true;
  }
  material.color.set(finish.color);
  material.transparent = false;
  material.opacity = 1;
}

export function createPergolaScene(
  host: HTMLElement,
  onContextLost: () => void,
  initialAnnotationsVisible = true,
) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(DEFAULT_CAMERA_FOV, 1, 0.01, 100);
  const cameraRig = createCameraRig(camera, renderer.domElement);
  renderer.domElement.style.touchAction = "none";
  const light = new THREE.DirectionalLight(0xfff4e3, 2.4);
  light.position.set(-3, 7, 5);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc5baaa, 2.5), light);

  // A subtle generated grain keeps the clay finish independent of external image assets.
  const grainCanvas = document.createElement("canvas");
  grainCanvas.width = 64;
  grainCanvas.height = 256;
  const ctx = grainCanvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 64, 256);
  for (let x = 0; x < 64; x += 3) {
    ctx.strokeStyle = `rgba(95,64,35,${0.035 + (x % 7) * 0.007})`;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 3, 70, x - 2, 170, x + 1, 256);
    ctx.stroke();
  }
  const grain = new THREE.CanvasTexture(grainCanvas);
  grain.colorSpace = THREE.SRGBColorSpace;
  const wood = new THREE.MeshStandardMaterial({ roughness: 0.94, map: grain });
  const roof = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  const wall = new THREE.MeshStandardMaterial({ color: "#e8e3d9", roughness: 1 });
  const steel = new THREE.MeshStandardMaterial({
    color: "#606465",
    roughness: 0.7,
    metalness: 0.2,
  });
  const model = new THREE.Group();
  const guides = createDimensionGuides();
  let annotationsVisible = initialAnnotationsVisible;
  guides.group.visible = annotationsVisible;
  scene.add(model, guides.group);
  const modelBounds = new THREE.Box3();

  // Soft contact wash, without expensive or harsh real-time shadow maps.
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowCtx = shadowCanvas.getContext("2d")!;
  const gradient = shadowCtx.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, "rgba(79,62,41,0.16)");
  gradient.addColorStop(1, "rgba(79,62,41,0)");
  shadowCtx.fillStyle = gradient;
  shadowCtx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.015;
  scene.add(shadow);
  let config: PergolaConfig;
  let geometryKey = "";
  let disposed = false;
  let animationFrame = 0;
  let previousFrameTime = performance.now();
  const animate = (frameTime: number) => {
    if (disposed) return;
    const delta = Math.min(Math.max((frameTime - previousFrameTime) / 1000, 0), 0.05);
    previousFrameTime = frameTime;
    cameraRig.update(delta);
    if (config && annotationsVisible) guides.render(camera, modelBounds, config);
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  };
  animationFrame = requestAnimationFrame(animate);
  const clearModel = () => {
    for (const child of [...model.children]) {
      (child as THREE.Mesh).geometry.dispose();
      model.remove(child);
    }
  };
  const frameFill = () => (annotationsVisible ? { x: 0.9, y: 0.86 } : { x: 0.94, y: 0.9 });
  const activeBounds = () =>
    annotationsVisible && config ? boundsWithDimensionGuides(modelBounds, config) : modelBounds;
  const reframe = (canonicalDirection = false) => {
    if (!config || modelBounds.isEmpty()) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    cameraRig.setBounds(
      modelBounds,
      activeBounds(),
      width / height,
      frameFill(),
      canonicalDirection,
      CAMERA_DIRECTION,
    );
  };
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    guides.resize(width, height);
    if (config) reframe();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const lost = (event: Event) => {
    event.preventDefault();
    onContextLost();
  };
  renderer.domElement.addEventListener("webglcontextlost", lost);
  return {
    setAnnotationsVisible(nextVisible: boolean) {
      if (annotationsVisible === nextVisible) return;
      annotationsVisible = nextVisible;
      guides.group.visible = nextVisible;
      if (config) reframe();
    },
    update(next: PergolaConfig) {
      const first = !config;
      const dimensionsChanged =
        config &&
        (config.model !== next.model ||
          config.width !== next.width ||
          config.depth !== next.depth ||
          config.height !== next.height);
      config = next;
      applyWoodFinish(wood, grain, WOOD_PAINTS[next.wood]);
      roof.color.set(ROOF_COLORS[next.roof].color);
      const nextKey = [
        next.model,
        next.width,
        next.depth,
        next.height,
        next.anchors,
        next.roofing,
      ].join("-");
      const geometryChanged = geometryKey !== nextKey;
      if (geometryChanged) {
        clearModel();
        for (const part of pergolaParts(next)) {
          const mesh = new THREE.Mesh(
            part.kind === "roof"
              ? new THREE.BoxGeometry(...part.size)
              : new RoundedBoxGeometry(...part.size, 1, 0.008),
            part.kind === "roof"
              ? roof
              : part.kind === "anchor"
                ? steel
                : part.kind === "wall"
                  ? wall
                  : wood,
          );
          mesh.position.set(...part.position);
          mesh.rotation.x = part.rotationX ?? 0;
          mesh.name = part.kind;
          model.add(mesh);
        }
        shadow.scale.set(next.width + 3, next.depth + 3, 1);
        model.updateWorldMatrix(true, true);
        modelBounds.setFromObject(model, true);
        geometryKey = nextKey;
      }
      if (first) reframe(true);
      else if (dimensionsChanged || geometryChanged) reframe();
    },
    command(action: "reset" | "in" | "out" | "left" | "right" | "up" | "down") {
      if (action === "reset") return reframe(true);
      cameraRig.command(action);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      cameraRig.dispose();
      guides.dispose();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      clearModel();
      wood.dispose();
      roof.dispose();
      wall.dispose();
      steel.dispose();
      grain.dispose();
      shadow.geometry.dispose();
      shadowMaterial.dispose();
      shadowTexture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
