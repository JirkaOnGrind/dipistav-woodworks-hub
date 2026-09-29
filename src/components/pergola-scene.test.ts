import { describe, expect, it } from "vitest";
import { Box3, MeshStandardMaterial, PerspectiveCamera, Texture, Vector3 } from "three";
import { WOOD_PAINTS } from "@/lib/pergola";
import {
  applyWoodFinish,
  calculateCameraFit,
  calculateCameraLimits,
  calculateClippingPlanes,
  floorSafePolarAngle,
} from "./pergola-scene";

function corners(bounds: Box3) {
  const result: Vector3[] = [];
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) result.push(new Vector3(x, y, z));
  return result;
}

function fittedCamera(
  bounds: Box3,
  aspect: number,
  frameFill: number | { x: number; y: number },
  direction?: Vector3,
  target?: Vector3,
) {
  const camera = new PerspectiveCamera(38, aspect);
  const fit = calculateCameraFit(bounds, aspect, frameFill, direction, target, camera.fov);
  camera.position.copy(fit.target).addScaledVector(fit.direction, fit.distance);
  camera.lookAt(fit.target);
  const limits = calculateCameraLimits(fit.radius, fit.distance);
  const clipping = calculateClippingPlanes(fit.distance, limits.maxDistance, fit.radius);
  camera.near = clipping.near;
  camera.far = clipping.far;
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return { camera, ...fit, ...limits };
}

describe("pergola camera fitting", () => {
  it("keeps every mesh corner inside the initial canvas at supported sizes and aspect ratios", () => {
    for (const [width, depth, height] of [
      [4, 4, 2],
      [6, 4, 4],
      [4, 6, 3],
      [6, 6, 4],
    ]) {
      const bounds = new Box3(
        new Vector3(-width / 2 - 0.2, 0, -depth / 2 - 0.2),
        new Vector3(width / 2 + 0.2, height + 0.5, depth / 2 + 0.2),
      );
      for (const aspect of [0.7, 1, 1.35, 16 / 9]) {
        const { camera } = fittedCamera(bounds, aspect, 0.94);
        for (const point of corners(bounds)) {
          const projected = point.clone().project(camera);
          expect(Math.abs(projected.x)).toBeLessThanOrEqual(0.940001);
          expect(Math.abs(projected.y)).toBeLessThanOrEqual(0.940001);
          expect(projected.z).toBeGreaterThanOrEqual(-1);
          expect(projected.z).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("keeps a stable FOV while moving the camera for different mesh bounds", () => {
    const compact = fittedCamera(
      new Box3(new Vector3(-2, 0, -2), new Vector3(2, 2.5, 2)),
      1.5,
      0.9,
    );
    const large = fittedCamera(new Box3(new Vector3(-3, 0, -2), new Vector3(3, 4.5, 2)), 1.5, 0.9);
    expect(large.camera.fov).toBeCloseTo(compact.camera.fov);
    expect(large.distance).toBeGreaterThan(compact.distance);
  });

  it("preserves the requested orbit direction while refitting", () => {
    const direction = new Vector3(-0.7, 0.45, 1).normalize();
    const bounds = new Box3(new Vector3(-3, 0, -2), new Vector3(3, 4, 2));
    const { camera, target } = fittedCamera(bounds, 0.8, 0.9, direction);
    expect(camera.position.clone().sub(target).normalize().distanceTo(direction)).toBeLessThan(
      1e-8,
    );
  });

  it("uses the physical geometry center when fitting wider guide bounds", () => {
    const guideBounds = new Box3(new Vector3(-4, -1.2, -4), new Vector3(4, 4.8, 4));
    const physicalCenter = new Vector3(0, 2.35, 0);
    const { target } = fittedCamera(guideBounds, 1.4, 0.9, new Vector3(1, 0.7, 1), physicalCenter);
    expect(target.y).toBe(physicalCenter.y);
  });

  it("honors independent horizontal and vertical safe frames", () => {
    const bounds = new Box3(new Vector3(-3.4, -0.4, -3.4), new Vector3(3.4, 4.5, 3.4));
    const { camera } = fittedCamera(bounds, 1.2, { x: 0.76, y: 0.84 });
    for (const point of corners(bounds)) {
      const projected = point.clone().project(camera);
      expect(Math.abs(projected.x)).toBeLessThanOrEqual(0.760001);
      expect(Math.abs(projected.y)).toBeLessThanOrEqual(0.840001);
    }
  });

  it("anchors to the exact global bounding-box centroid", () => {
    const bounds = new Box3(new Vector3(-4, 0, -1), new Vector3(2, 6, 5));
    const fit = calculateCameraFit(bounds, 1.5, 0.9);
    expect(fit.target.equals(new Vector3(-1, 3, 2))).toBe(true);
  });

  it("keeps the lens outside the bounding sphere at minimum zoom", () => {
    const { minDistance } = calculateCameraLimits(5, 12);
    expect(minDistance).toBeGreaterThan(5);
  });

  it("keeps the complete object inside the frustum at maximum zoom distance", () => {
    const radius = 4.5;
    const maxDistance = 30;
    const { near, far } = calculateClippingPlanes(maxDistance, maxDistance, radius);
    expect(near).toBeLessThan(maxDistance - radius);
    expect(far).toBeGreaterThan(maxDistance + radius);
  });

  it("allows a lower-hemisphere orbit without crossing the ground plane", () => {
    const targetY = 2;
    const distance = 10;
    const polarAngle = floorSafePolarAngle(targetY, distance);
    expect(polarAngle).toBeGreaterThan(Math.PI / 2);
    expect(targetY + Math.cos(polarAngle) * distance).toBeGreaterThanOrEqual(0);
  });

  it("keeps grain for stains and removes it for opaque paint without transparency", () => {
    const grain = new Texture();
    const material = new MeshStandardMaterial({ map: grain });
    applyWoodFinish(material, grain, WOOD_PAINTS.teakRc545);
    expect(material.map).toBe(grain);
    expect(material.color.getHexString()).toBe("81502f");
    expect(material.opacity).toBe(1);
    expect(material.transparent).toBe(false);
    applyWoodFinish(material, grain, WOOD_PAINTS.ral9016Opaque);
    expect(material.map).toBeNull();
    expect(material.color.getHexString()).toBe("f6f6f6");
    expect(material.opacity).toBe(1);
    expect(material.transparent).toBe(false);
  });
});
