import { describe, expect, it } from "vitest";
import { Box3, Matrix4, PerspectiveCamera, Vector3 } from "three";
import { clipDimensionSegment, dimensionAnchors, DIMENSION_OFFSET } from "./pergola-dimensions";

describe("pergola dimensions", () => {
  for (const width of [2, 6])
    for (const depth of [2, 6])
      for (const height of [2, 3]) {
        it(`measures ${width} × ${depth} × ${height} outside the model in every quadrant`, () => {
          const bounds = new Box3(
            new Vector3(-width / 2 - 0.2, 0, -depth / 2 - 0.2),
            new Vector3(width / 2 + 0.2, height + 0.5, depth / 2 + 0.2),
          );
          for (const x of [-1, 1])
            for (const z of [-1, 1]) {
              const guides = dimensionAnchors(
                bounds,
                { model: "freestanding-pent", width, depth, height },
                x,
                z,
              );
              for (const [key, [a, b]] of Object.entries(guides)) {
                expect(a.distanceTo(b)).toBeCloseTo({ width, depth, height }[key as "width"]);
                for (let t = 0; t <= 1; t += 0.1) {
                  const point = a.clone().lerp(b, t);
                  expect(bounds.distanceToPoint(point)).toBeGreaterThanOrEqual(
                    DIMENSION_OFFSET - 1e-9,
                  );
                }
              }
            }
        });
      }
  it("anchors wall depth to the theoretical wall face and gable height to the eave", () => {
    const bounds = new Box3(new Vector3(-3.5, 0, -3.2), new Vector3(3.5, 4.2, 3));
    const wall = dimensionAnchors(
      bounds,
      { model: "wall-pent", width: 6, depth: 6, height: 2.5 },
      1,
      1,
    );
    const gable = dimensionAnchors(
      bounds,
      { model: "gable-freestanding", width: 6, depth: 6, height: 2.5 },
      1,
      1,
    );

    expect(wall.depth[0].z).toBe(-3);
    expect(wall.depth[1].z).toBe(3);
    expect(gable.height[1].y).toBe(2.5);
    expect(gable.height[1].y).toBeLessThan(bounds.max.y);
  });
  it("clips a segment crossing the near plane without mirrored or infinite coordinates", () => {
    const camera = new PerspectiveCamera(36, 1, 0.1, 120);
    camera.updateMatrixWorld();
    const matrix = new Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    const line = clipDimensionSegment(new Vector3(0, 0, 1), new Vector3(0, 0, -3), matrix);
    expect(line).not.toBeNull();
    for (const p of line!)
      for (const value of [p.x, p.y, p.z]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(Math.abs(value)).toBeLessThanOrEqual(1.000001);
      }
    expect(clipDimensionSegment(new Vector3(0, 0, 1), new Vector3(1, 1, 2), matrix)).toBeNull();
  });
});
