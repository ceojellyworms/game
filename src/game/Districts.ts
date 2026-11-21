import type { SaveData, UpgradeId } from "./SaveSystem";

export type BossStyle = "donut" | "hotdog" | "burger";
export type DistrictConfig = {
  id: number;
  name: string;
  tagline: string;
  sign: string;
  sky: number;
  road: number;
  sidewalk: number;
  buildingColors: number[];
  accent: number;
  bossStyle: BossStyle;
  bossName: string;
  bossHealth: number;
  bossAfter: number;
  enemyHealth: number;
  enemySpeed: number;
  enemyDamage: number;
  gate: Record<UpgradeId, number>;
};

export const DISTRICTS: DistrictConfig[] = [
  {
    id: 0, name: "Diner District", tagline: "The breakfast rush", sign: "DINER",
    sky: 0x8bbcf3, road: 0x55586a, sidewalk: 0xa9a7a9,
    buildingColors: [0xc47a57, 0x526b9a, 0x8372a6, 0xe0a24f, 0x598d81], accent: 0xc53b54,
    bossStyle: "donut", bossName: "THE SPRINKLE KING", bossHealth: 105, bossAfter: 75,
    enemyHealth: 1, enemySpeed: 1, enemyDamage: 1,
    gate: { damageLevel: 2, reloadLevel: 1, moveSpeedLevel: 0 },
  },
  {
    id: 1, name: "Boardwalk Bay", tagline: "Salt air, extra calories", sign: "BOARDWALK",
    sky: 0x69b8d0, road: 0x416c77, sidewalk: 0xd9bd85,
    buildingColors: [0xe47f54, 0x42a6a1, 0xe0bf56, 0x6686be, 0xf0d5a2], accent: 0xf06b4e,
    bossStyle: "hotdog", bossName: "CAPTAIN FRANK", bossHealth: 155, bossAfter: 100,
    enemyHealth: 1.22, enemySpeed: 1.12, enemyDamage: 1.16,
    gate: { damageLevel: 3, reloadLevel: 2, moveSpeedLevel: 1 },
  },
  {
    id: 2, name: "Downtown Crunch", tagline: "The lunch-hour stampede", sign: "CRUNCH TOWER",
    sky: 0x59558e, road: 0x45415f, sidewalk: 0x89819b,
    buildingColors: [0x7064a4, 0x516d9e, 0x85638d, 0x4e8c94, 0x9b6a79], accent: 0x54e0da,
    bossStyle: "burger", bossName: "THE DOUBLE-DECKER", bossHealth: 235, bossAfter: 125,
    enemyHealth: 1.48, enemySpeed: 1.24, enemyDamage: 1.34,
    gate: { damageLevel: 4, reloadLevel: 3, moveSpeedLevel: 2 },
  },
  {
    id: 3, name: "Neon Strip", tagline: "One last supersized showdown", sign: "NEON PALACE",
    sky: 0x29294f, road: 0x373149, sidewalk: 0x61546d,
    buildingColors: [0x804f8b, 0x455b92, 0xa05277, 0x6d538f, 0x407987], accent: 0xff4ba1,
    bossStyle: "burger", bossName: "THE FINAL FEAST", bossHealth: 340, bossAfter: 155,
    enemyHealth: 1.76, enemySpeed: 1.38, enemyDamage: 1.55,
    gate: { damageLevel: 5, reloadLevel: 4, moveSpeedLevel: 3 },
  },
];

export function getDistrict(id: number) {
  return DISTRICTS[Math.max(0, Math.min(DISTRICTS.length - 1, Math.floor(id)))];
}

export function gateRequirementsMet(save: SaveData, districtId: number) {
  const gate = getDistrict(districtId).gate;
  return (Object.keys(gate) as UpgradeId[]).every((upgrade) => save.upgrades[upgrade] >= gate[upgrade]);
}

export function formatGateProgress(save: SaveData, districtId: number) {
  const gate = getDistrict(districtId).gate;
  const short: Record<UpgradeId, string> = { damageLevel: "DMG", reloadLevel: "FIRE RATE", moveSpeedLevel: "SPEED" };
  return (Object.keys(gate) as UpgradeId[])
    .filter((upgrade) => gate[upgrade] > 0)
    .map((upgrade) => `${short[upgrade]} ${Math.min(save.upgrades[upgrade], gate[upgrade])}/${gate[upgrade]}`)
    .join("  ·  ");
}
