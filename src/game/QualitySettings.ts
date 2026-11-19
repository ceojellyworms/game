export type QualityPreset = "low" | "medium" | "high";

const QUALITY_KEY = "burger-buster-quality";
const PIXEL_RATIO_CAP: Record<QualityPreset, number> = { low: 1, medium: 1.25, high: 1.6 };

export function loadQuality(): QualityPreset {
  try {
    const stored = window.localStorage.getItem(QUALITY_KEY);
    if (stored === "low" || stored === "medium" || stored === "high") return stored;
  } catch (error) {
    console.info("Could not read graphics preference; using automatic quality.", error);
  }
  const lowPowerDevice = window.matchMedia("(pointer: coarse)").matches || navigator.hardwareConcurrency <= 4;
  return lowPowerDevice ? "low" : "high";
}

export function saveQuality(quality: QualityPreset) {
  try {
    window.localStorage.setItem(QUALITY_KEY, quality);
  } catch (error) {
    console.info("Could not save graphics preference for this browser.", error);
  }
}

export function nextQuality(quality: QualityPreset): QualityPreset {
  return quality === "low" ? "medium" : quality === "medium" ? "high" : "low";
}

export function pixelRatioFor(quality: QualityPreset) {
  return Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_CAP[quality]);
}
