import type { ProductVariant } from "@/lib/product-catalog";

export type ArtworkInteractionMotion = {
  lengthScale: number;
  profileScale: number;
  scale: number;
  scaleX: number;
  scaleY: number;
  translateXPercent: number;
  translateYPercent: number;
};

export const ARTWORK_PERCEPTUAL_BOUNDS = {
  minimumScale: 0.92,
  maximumScale: 1.08,
} as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function legacyScaleBetween(value: number, minimum: number, maximum: number) {
  if (maximum <= minimum) return 1;
  return 1 + 0.06 * clamp((value - minimum) / (maximum - minimum), 0, 1);
}

function smoothstep(value: number) {
  const progress = clamp(value, 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function perceptualScaleBetween(
  value: number,
  minimum: number,
  maximum: number,
  minimumScale: number,
  maximumScale: number,
) {
  if (maximum <= minimum) return 1;
  const progress = smoothstep((value - minimum) / (maximum - minimum));
  return minimumScale + (maximumScale - minimumScale) * progress;
}

function getLegacyLengthScale(lengthMm?: number) {
  if (!lengthMm || lengthMm <= 3000) return 1;
  if (lengthMm <= 4000) return 1 + ((lengthMm - 3000) / 1000) * 0.05;
  if (lengthMm <= 5000) return 1.05 + ((lengthMm - 4000) / 1000) * 0.04;
  return 1.09;
}

function getLengthScale(categoryId: string, lengthMm?: number) {
  if (categoryId === "late") return getLegacyLengthScale(lengthMm);
  if (!lengthMm) return 1;
  if (lengthMm <= 3000) return 0.977;
  if (lengthMm <= 4000) return 0.977 + ((lengthMm - 3000) / 1000) * 0.023;
  if (lengthMm <= 5000) return 1 + ((lengthMm - 4000) / 1000) * 0.023;
  if (lengthMm <= 6000) return 1.023 + ((lengthMm - 5000) / 1000) * 0.01725;
  if (lengthMm <= 7000) return 1.04025 + ((lengthMm - 6000) / 1000) * 0.01725;
  return 1.0575;
}

function getProfileMotion(categoryId: string, variant?: ProductVariant) {
  const dimensions = variant?.dimensions;
  if (!dimensions) return { massScale: 1, aspectScaleX: 1, aspectScaleY: 1 };

  if (categoryId === "tramy" && dimensions.widthMm && dimensions.heightMm) {
    const massScale = perceptualScaleBetween(
      Math.sqrt(dimensions.widthMm * dimensions.heightMm),
      80,
      200,
      0.95,
      1.05,
    );
    const aspectScaleX = clamp(
      Math.pow(dimensions.widthMm / dimensions.heightMm, 0.035),
      0.968,
      1.032,
    );
    return { massScale, aspectScaleX, aspectScaleY: 1 / aspectScaleX };
  }
  if (categoryId === "late" && dimensions.widthMm && dimensions.heightMm) {
    return {
      massScale: legacyScaleBetween(
        Math.sqrt(dimensions.widthMm * dimensions.heightMm),
        Math.sqrt(1500),
        Math.sqrt(2400),
      ),
      aspectScaleX: 1,
      aspectScaleY: 1,
    };
  }
  if (categoryId === "prkna" && dimensions.widthMm) {
    return {
      massScale: perceptualScaleBetween(dimensions.widthMm, 80, 200, 0.96, 1.04),
      aspectScaleX: 1,
      aspectScaleY: 1,
    };
  }
  if (categoryId === "fosny" && dimensions.widthMm && dimensions.thicknessMm) {
    return {
      massScale: perceptualScaleBetween(
        Math.sqrt(dimensions.widthMm * dimensions.thicknessMm),
        Math.sqrt(80 * 25),
        Math.sqrt(200 * 60),
        0.97,
        1.03,
      ),
      aspectScaleX: 1,
      aspectScaleY: 1,
    };
  }
  return { massScale: 1, aspectScaleX: 1, aspectScaleY: 1 };
}

export function getArtworkInteractionMotion(
  categoryId: string,
  variant?: ProductVariant,
): ArtworkInteractionMotion {
  const lengthScale = getLengthScale(categoryId, variant?.dimensions?.lengthMm);
  const {
    massScale: profileScale,
    aspectScaleX,
    aspectScaleY,
  } = getProfileMotion(categoryId, variant);
  const legacyLathScale = lengthScale * profileScale;
  const scaleX =
    categoryId === "late"
      ? legacyLathScale
      : clamp(
          lengthScale * profileScale * aspectScaleX,
          ARTWORK_PERCEPTUAL_BOUNDS.minimumScale,
          ARTWORK_PERCEPTUAL_BOUNDS.maximumScale,
        );
  const scaleY =
    categoryId === "late"
      ? legacyLathScale
      : clamp(
          profileScale * aspectScaleY,
          ARTWORK_PERCEPTUAL_BOUNDS.minimumScale,
          ARTWORK_PERCEPTUAL_BOUNDS.maximumScale,
        );
  const scale = Math.sqrt(scaleX * scaleY);
  const depthProgress =
    categoryId === "late"
      ? clamp((lengthScale - 0.95) / 0.15, 0, 1)
      : clamp((lengthScale - 0.977) / 0.0805, 0, 1);
  const translationStrength = categoryId === "late" ? 1.8 : 0.8;
  return {
    lengthScale: Number(lengthScale.toFixed(4)),
    profileScale: Number(profileScale.toFixed(4)),
    scale: Number(scale.toFixed(4)),
    scaleX: Number(scaleX.toFixed(4)),
    scaleY: Number(scaleY.toFixed(4)),
    translateXPercent: Number((-translationStrength * depthProgress).toFixed(3)),
    translateYPercent: Number((-(translationStrength / 2) * depthProgress).toFixed(3)),
  };
}
