export type UpgradeId = "damageLevel" | "reloadLevel" | "moveSpeedLevel";

export type SaveData = {
  version: 2;
  totalCoins: number;
  bestTime: number;
  upgrades: Record<UpgradeId, number>;
  unlockedDistrict: number;
  campaignComplete: boolean;
};

const SAVE_KEY = "burger-buster-save";
const MAX_LEVEL = 5;

export function defaultSave(): SaveData {
  return { version: 2, totalCoins: 0, bestTime: 0, upgrades: { damageLevel: 0, reloadLevel: 0, moveSpeedLevel: 0 }, unlockedDistrict: 0, campaignComplete: false };
}

export function upgradeCost(level: number) {
  return 20 + level * 20;
}

export function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) {
      const legacy = Number(window.localStorage.getItem("burger-buster-best-time") ?? 0);
      const migrated = defaultSave();
      if (Number.isFinite(legacy) && legacy > 0) {
        migrated.bestTime = legacy;
        persistSave(migrated);
      }
      return migrated;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return defaultSave();
    const storedVersion = (parsed as { version?: unknown }).version;
    if (typeof storedVersion === "number" && (storedVersion < 0 || storedVersion > 2)) return defaultSave();
    const data = parsed as Partial<SaveData>;
    const levels = data.upgrades ?? defaultSave().upgrades;
    const safeLevel = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(MAX_LEVEL, Math.floor(value))) : 0;
    return {
      version: 2,
      totalCoins: typeof data.totalCoins === "number" && Number.isFinite(data.totalCoins) ? Math.max(0, Math.floor(data.totalCoins)) : 0,
      bestTime: typeof data.bestTime === "number" && Number.isFinite(data.bestTime) ? Math.max(0, data.bestTime) : 0,
      unlockedDistrict: typeof data.unlockedDistrict === "number" && Number.isFinite(data.unlockedDistrict) ? Math.max(0, Math.min(3, Math.floor(data.unlockedDistrict))) : 0,
      campaignComplete: data.campaignComplete === true,
      upgrades: {
        damageLevel: safeLevel(levels.damageLevel),
        reloadLevel: safeLevel(levels.reloadLevel),
        moveSpeedLevel: safeLevel(levels.moveSpeedLevel),
      },
    };
  } catch {
    return defaultSave();
  }
}

export function persistSave(data: SaveData) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.warn("Could not persist Burger Buster progress.", error);
    return false;
  }
}

export function maxUpgradeLevel() {
  return MAX_LEVEL;
}
