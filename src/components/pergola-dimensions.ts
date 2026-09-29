import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Group,
  LineDashedMaterial,
  LineSegments,
  Matrix4,
  PerspectiveCamera,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  Vector4,
} from "three";
import type { PergolaConfig } from "@/lib/pergola";

// World-space clearance is independent of model size, roof overhang and zoom.
export const DIMENSION_OFFSET = 0.4;
type Dimensions = Pick<PergolaConfig, "model" | "width" | "depth" | "height">;
type DimensionKey = Exclude<keyof Dimensions, "model">;
const NAMES = { width: "Šířka", depth: "Hloubka", height: "Výška" } as const;

export function dimensionAnchors(bounds: Box3, config: Dimensions, sideX = 1, sideZ = 1) {
  const x = (sideX > 0 ? bounds.max.x : bounds.min.x) + sideX * DIMENSION_OFFSET;
  const z = (sideZ > 0 ? bounds.max.z : bounds.min.z) + sideZ * DIMENSION_OFFSET;
  const heightX = (sideX > 0 ? bounds.min.x : bounds.max.x) - sideX * DIMENSION_OFFSET;
  const floor = bounds.min.y - DIMENSION_OFFSET;
  // The wall-mounted depth starts at the theoretical wall face. Height always
  // ends at the eave, even when the gable ridge extends above it.
  const backAttachmentZ = -config.depth / 2;
  return {
    width: [new Vector3(-config.width / 2, floor, z), new Vector3(config.width / 2, floor, z)],
    depth: [new Vector3(x, floor, backAttachmentZ), new Vector3(x, floor, config.depth / 2)],
    height: [new Vector3(heightX, 0, z), new Vector3(heightX, config.height, z)],
  };
}

export function boundsWithDimensionGuides(bounds: Box3, config: Dimensions) {
  const result = bounds.clone();
  for (const sideX of [-1, 1]) {
    for (const sideZ of [-1, 1]) {
      for (const segment of Object.values(dimensionAnchors(bounds, config, sideX, sideZ))) {
        result.expandByPoint(segment[0]);
        result.expandByPoint(segment[1]);
      }
    }
  }
  return result;
}

// Clip in homogeneous space before dividing by w: panning/zooming through the
// near plane must never mirror a line or produce infinite SVG coordinates.
export function clipDimensionSegment(start: Vector3, end: Vector3, matrix: Matrix4) {
  const a = new Vector4(start.x, start.y, start.z, 1).applyMatrix4(matrix);
  const b = new Vector4(end.x, end.y, end.z, 1).applyMatrix4(matrix);
  let low = 0;
  let high = 1;
  for (const axis of ["x", "y", "z"] as const) {
    for (const sign of [-1, 1]) {
      const fa = a.w + sign * a[axis];
      const fb = b.w + sign * b[axis];
      if (fa < 0 && fb < 0) return null;
      if (fa < 0) low = Math.max(low, fa / (fa - fb));
      if (fb < 0) high = Math.min(high, fa / (fa - fb));
    }
  }
  if (low > high) return null;
  const from = a.clone().lerp(b, low);
  const to = a.clone().lerp(b, high);
  if (from.w <= 0 || to.w <= 0) return null;
  return [from.multiplyScalar(1 / from.w), to.multiplyScalar(1 / to.w)];
}

const LABEL_WIDTH_PX = 112;
const LABEL_HEIGHT_PX = 28;
const LABEL_EDGE_GUTTER_PX = 8;
const IN_CANVAS_CONTROLS_GUTTER_PX = 62;

function paintLabel(canvas: HTMLCanvasElement, text: string) {
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255, 253, 248, 0.94)";
  context.strokeStyle = "rgba(92, 57, 28, 0.7)";
  context.lineWidth = 4;
  context.beginPath();
  context.roundRect(3, 3, canvas.width - 6, canvas.height - 6, 24);
  context.fill();
  context.stroke();
  context.fillStyle = "#51351f";
  context.font = "700 44px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
}

export function createDimensionGuides() {
  const group = new Group();
  group.name = "pergola-dimension-guides";
  group.renderOrder = 20;
  const entries = (Object.keys(NAMES) as DimensionKey[]).map((key) => {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(8 * 3);
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    const lineMaterial = new LineDashedMaterial({
      color: 0x694321,
      dashSize: 0.1,
      gapSize: 0.065,
      linewidth: 1.25,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.82,
    });
    const line = new LineSegments(geometry, lineMaterial);
    line.renderOrder = 20;
    const canvas = document.createElement("canvas");
    canvas.width = 448;
    canvas.height = 112;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    const labelMaterial = new SpriteMaterial({
      map: texture,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    const label = new Sprite(labelMaterial);
    label.renderOrder = 21;
    group.add(line, label);
    return {
      key,
      line,
      lineMaterial,
      geometry,
      positions,
      canvas,
      texture,
      label,
      labelMaterial,
      text: "",
    };
  });
  let width = 1;
  let height = 1;
  let sideX = 1;
  let sideZ = 1;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const midpoint = new Vector3();
  const viewPoint = new Vector3();
  const cameraRight = new Vector3();
  const cameraUp = new Vector3();
  const lineDirection = new Vector3();
  const viewDirection = new Vector3();
  const tickDirection = new Vector3();

  return {
    group,
    resize(nextWidth: number, nextHeight: number) {
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
    },
    render(camera: PerspectiveCamera, bounds: Box3, config: Dimensions) {
      if (bounds.isEmpty()) return;
      const center = bounds.getCenter(new Vector3());
      if (Math.abs(camera.position.x - center.x) > 0.2)
        sideX = camera.position.x >= center.x ? 1 : -1;
      if (Math.abs(camera.position.z - center.z) > 0.2)
        sideZ = camera.position.z >= center.z ? 1 : -1;

      const anchors = dimensionAnchors(bounds, config, sideX, sideZ);
      cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
      cameraUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
      const occupied: { x: number; y: number }[] = [];

      for (const entry of entries) {
        const text = `${NAMES[entry.key]} ${config[entry.key].toFixed(1).replace(".", ",")} m`;
        if (entry.text !== text) {
          paintLabel(entry.canvas, text);
          entry.texture.needsUpdate = true;
          entry.text = text;
        }

        const [start, end] = anchors[entry.key];
        midpoint.copy(start).add(end).multiplyScalar(0.5);
        viewPoint.copy(midpoint).applyMatrix4(camera.matrixWorldInverse);
        const depth = Math.max(-viewPoint.z, camera.near);
        const worldPerPixel =
          (2 * depth * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(height, 1);
        const projected = midpoint.clone().project(camera);
        const anchorX = ((projected.x + 1) * width) / 2;
        const anchorY = ((1 - projected.y) * height) / 2;
        const awayX = anchorX - width / 2;
        const awayY = anchorY - height / 2;
        const awayLength = Math.hypot(awayX, awayY) || 1;
        const baseX = clamp(
          anchorX + (awayX / awayLength) * 16,
          LABEL_WIDTH_PX / 2 + LABEL_EDGE_GUTTER_PX,
          width - LABEL_WIDTH_PX / 2 - LABEL_EDGE_GUTTER_PX,
        );
        const baseY = clamp(
          anchorY + (awayY / awayLength) * 16,
          LABEL_HEIGHT_PX / 2 + LABEL_EDGE_GUTTER_PX,
          height - LABEL_HEIGHT_PX / 2 - IN_CANVAS_CONTROLS_GUTTER_PX,
        );
        const candidates = [
          [0, 0],
          [0, -34],
          [0, 34],
          [118, 0],
          [-118, 0],
          [0, -68],
          [0, 68],
        ];
        const chosen = candidates
          .map(([dx, dy]) => ({
            x: clamp(
              baseX + dx,
              LABEL_WIDTH_PX / 2 + LABEL_EDGE_GUTTER_PX,
              width - LABEL_WIDTH_PX / 2 - LABEL_EDGE_GUTTER_PX,
            ),
            y: clamp(
              baseY + dy,
              LABEL_HEIGHT_PX / 2 + LABEL_EDGE_GUTTER_PX,
              height - LABEL_HEIGHT_PX / 2 - IN_CANVAS_CONTROLS_GUTTER_PX,
            ),
          }))
          .find((candidate) =>
            occupied.every(
              (placed) =>
                Math.abs(candidate.x - placed.x) >= LABEL_WIDTH_PX ||
                Math.abs(candidate.y - placed.y) >= LABEL_HEIGHT_PX + 4,
            ),
          ) ?? { x: baseX, y: baseY };

        occupied.push(chosen);
        const offsetX = (chosen.x - anchorX) * worldPerPixel;
        const offsetY = (anchorY - chosen.y) * worldPerPixel;
        entry.label.position
          .copy(midpoint)
          .addScaledVector(cameraRight, offsetX)
          .addScaledVector(cameraUp, offsetY);
        entry.label.scale.set(LABEL_WIDTH_PX * worldPerPixel, LABEL_HEIGHT_PX * worldPerPixel, 1);

        lineDirection.copy(end).sub(start).normalize();
        viewDirection.copy(camera.position).sub(midpoint).normalize();
        tickDirection.crossVectors(viewDirection, lineDirection);
        if (tickDirection.lengthSq() < 0.0001) tickDirection.copy(cameraUp);
        tickDirection.normalize().multiplyScalar(4 * worldPerPixel);
        const leaderVisible = Math.hypot(chosen.x - anchorX, chosen.y - anchorY) > 10;
        const points = [
          start,
          end,
          start.clone().sub(tickDirection),
          start.clone().add(tickDirection),
          end.clone().sub(tickDirection),
          end.clone().add(tickDirection),
          midpoint,
          leaderVisible ? entry.label.position : midpoint,
        ];
        points.forEach((point, index) => point.toArray(entry.positions, index * 3));
        entry.geometry.attributes.position.needsUpdate = true;
        entry.geometry.computeBoundingSphere();
        entry.lineMaterial.dashSize = 6 * worldPerPixel;
        entry.lineMaterial.gapSize = 4 * worldPerPixel;
        entry.line.computeLineDistances();
      }
    },
    dispose() {
      group.removeFromParent();
      for (const entry of entries) {
        entry.geometry.dispose();
        entry.lineMaterial.dispose();
        entry.texture.dispose();
        entry.labelMaterial.dispose();
      }
    },
  };
}
