import * as THREE from "three";

const flat = (color: number) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8 });

function addMesh(parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, position: [number, number, number], scale?: [number, number, number]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export type BodyState = "fat_03" | "fat_02" | "normal" | "fit_01" | "fit_02" | "muscle";

export function getBodyState(fat: number): BodyState {
  if (fat >= 80) return "fat_03";
  if (fat >= 60) return "fat_02";
  if (fat >= 40) return "normal";
  if (fat >= 20) return "fit_01";
  if (fat >= 5) return "fit_02";
  return "muscle";
}

export function getBodyLabel(state: BodyState) {
  return ({ fat_03: "FAT", fat_02: "HEAVY", normal: "NORMAL", fit_01: "FIT", fit_02: "ATHLETIC", muscle: "MUSCULAR" })[state];
}

export class PlayerModel {
  readonly root = new THREE.Group();
  private readonly variants = new Map<BodyState, THREE.Group>();
  private readonly muzzle: THREE.Group;

  constructor() {
    this.muzzle = new THREE.Group();
    this.root.add(this.muzzle);
    this.variants.set("fat_03", this.buildVariant(0.66, 0.56, 0.29, 0.28));
    this.variants.set("fat_02", this.buildVariant(0.56, 0.47, 0.25, 0.25));
    this.variants.set("normal", this.buildVariant(0.43, 0.36, 0.2, 0.22));
    this.variants.set("fit_01", this.buildVariant(0.39, 0.31, 0.19, 0.2));
    this.variants.set("fit_02", this.buildVariant(0.4, 0.29, 0.21, 0.21));
    this.variants.set("muscle", this.buildVariant(0.49, 0.35, 0.28, 0.26));
    for (const group of this.variants.values()) this.root.add(group);
    this.setFat(84);
  }

  setFat(fat: number) {
    const state = getBodyState(fat);
    for (const [key, group] of this.variants) group.visible = key === state;
  }

  face(x: number, z: number) {
    if (x * x + z * z > 0.001) this.root.rotation.y = Math.atan2(x, z);
  }

  private buildVariant(torsoRadius: number, bellyRadius: number, armRadius: number, legRadius: number) {
    const group = new THREE.Group();
    const skin = flat(0xf2b28c);
    const shirt = flat(0xf5f3f3);
    const shorts = flat(0x2459a7);
    const shoe = flat(0xfaf8f6);
    const hair = flat(0x754331);
    const dark = flat(0x302536);
    const iris = flat(0x593528);
    const torso = addMesh(group, new THREE.CapsuleGeometry(torsoRadius, 0.52, 4, 10), shirt, [0, 1.38, 0]);
    torso.scale.x = 1.04;
    addMesh(group, new THREE.SphereGeometry(bellyRadius, 10, 8), shirt, [0, 1.2, 0.22], [1.05, 0.78, 0.72]);
    addMesh(group, new THREE.BoxGeometry(0.68, 0.34, 0.42), shorts, [0, 0.84, 0]);
    for (const side of [-1, 1]) {
      addMesh(group, new THREE.CapsuleGeometry(legRadius, 0.43, 3, 8), skin, [side * 0.2, 0.43, 0]);
      addMesh(group, new THREE.BoxGeometry(0.34, 0.17, 0.48), shoe, [side * 0.22, 0.14, 0.12]);
      const arm = addMesh(group, new THREE.CapsuleGeometry(armRadius, 0.43, 3, 8), skin, [side * (torsoRadius + 0.24), 1.32, 0.03]);
      arm.rotation.z = side * -0.1;
      addMesh(group, new THREE.SphereGeometry(armRadius * 0.82, 8, 6), skin, [side * (torsoRadius + 0.24), 1.01, 0.06]);
    }
    addMesh(group, new THREE.SphereGeometry(0.31, 10, 8), skin, [0, 2.08, 0.04]);
    addMesh(group, new THREE.SphereGeometry(0.3, 10, 8), hair, [0, 2.28, -0.015], [1.02, 0.58, 0.98]);
    addMesh(group, new THREE.BoxGeometry(0.34, 0.09, 0.23), hair, [0, 2.25, 0.22]);
    for (const side of [-1, 1]) {
      addMesh(group, new THREE.SphereGeometry(0.055, 8, 6), shoe, [side * 0.115, 2.08, 0.303]);
      addMesh(group, new THREE.SphereGeometry(0.026, 7, 6), iris, [side * 0.115, 2.08, 0.35]);
      const brow = addMesh(group, new THREE.BoxGeometry(0.12, 0.035, 0.045), dark, [side * 0.115, 2.17, 0.32]);
      brow.rotation.z = side * -0.15;
    }
    addMesh(group, new THREE.BoxGeometry(0.16, 0.025, 0.035), dark, [0, 1.93, 0.33]);
    const gun = new THREE.Group();
    addMesh(gun, new THREE.BoxGeometry(0.14, 0.16, 0.26), flat(0x777e91), [0, 0, 0]);
    addMesh(gun, new THREE.BoxGeometry(0.09, 0.22, 0.11), dark, [0, -0.13, -0.01]);
    gun.position.set(torsoRadius + 0.2, 1.28, 0.27);
    group.add(gun);
    return group;
  }
}

export class DonutModel {
  readonly root = new THREE.Group();

  constructor() {
    const dough = flat(0xb96b37);
    const icing = flat(0xf14391);
    const white = flat(0xffffff);
    const black = flat(0x251f30);
    const limb = flat(0x884421);
    addMesh(this.root, new THREE.TorusGeometry(0.63, 0.24, 8, 14), dough, [0, 0.82, 0]);
    addMesh(this.root, new THREE.TorusGeometry(0.62, 0.19, 8, 14), icing, [0, 0.84, 0.07]);
    for (const side of [-1, 1]) {
      addMesh(this.root, new THREE.SphereGeometry(0.12, 8, 6), white, [side * 0.2, 0.94, 0.245]);
      addMesh(this.root, new THREE.SphereGeometry(0.055, 7, 6), black, [side * 0.2, 0.94, 0.34]);
      const brow = addMesh(this.root, new THREE.BoxGeometry(0.2, 0.055, 0.06), black, [side * 0.2, 1.13, 0.25]);
      brow.rotation.z = side * -0.24;
      const arm = addMesh(this.root, new THREE.CapsuleGeometry(0.08, 0.25, 3, 6), limb, [side * 0.76, 0.74, 0]);
      arm.rotation.z = side * 0.3;
      addMesh(this.root, new THREE.CapsuleGeometry(0.08, 0.18, 3, 6), limb, [side * 0.34, 0.14, 0]);
    }
    addMesh(this.root, new THREE.SphereGeometry(0.075, 8, 6), black, [0, 0.64, 0.28], [1.25, 0.7, 0.5]);
    const sprinkleColors = [0xffd84e, 0x42d7d0, 0x76d346];
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const sprinkle = addMesh(this.root, new THREE.BoxGeometry(0.14, 0.045, 0.05), flat(sprinkleColors[i % sprinkleColors.length]), [Math.cos(angle) * 0.58, 0.84 + Math.sin(angle) * 0.58, 0.2]);
      sprinkle.rotation.z = angle;
    }
  }
}

export type EnemyKind = "donut" | "hotdog" | "burger";
export type EnemyModel = { root: THREE.Group };

export class HotDogModel {
  readonly root = new THREE.Group();

  constructor() {
    const bun = addMesh(this.root, new THREE.CapsuleGeometry(0.27, 0.78, 4, 8), flat(0xe7a94e), [0, 0.78, 0]);
    bun.rotation.z = Math.PI / 2;
    const sausage = addMesh(this.root, new THREE.CapsuleGeometry(0.19, 0.76, 4, 8), flat(0xc94b32), [0, 0.83, 0.07]);
    sausage.rotation.z = Math.PI / 2;
    const mustardCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.45, 0.98, 0.26), new THREE.Vector3(-0.22, 0.86, 0.27),
      new THREE.Vector3(0, 0.99, 0.27), new THREE.Vector3(0.22, 0.86, 0.27), new THREE.Vector3(0.44, 0.98, 0.26),
    ]);
    addMesh(this.root, new THREE.TubeGeometry(mustardCurve, 16, 0.035, 5, false), flat(0xffd338), [0, 0, 0]);
    const white = flat(0xffffff);
    const black = flat(0x251f30);
    for (const side of [-1, 1]) {
      addMesh(this.root, new THREE.SphereGeometry(0.105, 8, 6), white, [side * 0.17, 0.94, 0.29]);
      addMesh(this.root, new THREE.SphereGeometry(0.046, 7, 6), black, [side * 0.17, 0.94, 0.36]);
      const brow = addMesh(this.root, new THREE.BoxGeometry(0.18, 0.045, 0.045), black, [side * 0.17, 1.1, 0.29]);
      brow.rotation.z = side * -0.22;
      const arm = addMesh(this.root, new THREE.CapsuleGeometry(0.07, 0.22, 3, 6), flat(0xa75132), [side * 0.45, 0.54, 0]);
      arm.rotation.z = side * 0.5;
      addMesh(this.root, new THREE.CapsuleGeometry(0.07, 0.16, 3, 6), flat(0x8a462f), [side * 0.29, 0.14, 0]);
    }
    addMesh(this.root, new THREE.SphereGeometry(0.065, 7, 6), black, [0, 0.64, 0.34], [1.2, 0.7, 0.4]);
  }
}

export class BurgerModel {
  readonly root = new THREE.Group();

  constructor() {
    const bun = flat(0xeaa83e);
    const patty = flat(0x70402c);
    const cheese = flat(0xffc72f);
    const lettuce = flat(0x59b942);
    addMesh(this.root, new THREE.CylinderGeometry(0.58, 0.63, 0.2, 10), bun, [0, 0.58, 0]);
    addMesh(this.root, new THREE.CylinderGeometry(0.6, 0.57, 0.23, 10), patty, [0, 0.78, 0]);
    const cheeseSlice = addMesh(this.root, new THREE.BoxGeometry(1.15, 0.12, 1.05), cheese, [0, 0.91, 0.01]);
    cheeseSlice.rotation.y = 0.22;
    addMesh(this.root, new THREE.CylinderGeometry(0.62, 0.58, 0.12, 10), lettuce, [0, 1.02, 0]);
    addMesh(this.root, new THREE.SphereGeometry(0.58, 10, 7), bun, [0, 1.24, 0], [1.15, 0.58, 0.95]);
    const sesame = flat(0xffe9ae);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      addMesh(this.root, new THREE.SphereGeometry(0.035, 6, 5), sesame, [Math.cos(angle) * 0.4, 1.49 - Math.abs(Math.cos(angle)) * 0.08, Math.sin(angle) * 0.34]);
    }
    const white = flat(0xffffff);
    const black = flat(0x251f30);
    for (const side of [-1, 1]) {
      addMesh(this.root, new THREE.SphereGeometry(0.12, 8, 6), white, [side * 0.19, 1.12, 0.46]);
      addMesh(this.root, new THREE.SphereGeometry(0.052, 7, 6), black, [side * 0.19, 1.12, 0.55]);
      const brow = addMesh(this.root, new THREE.BoxGeometry(0.21, 0.05, 0.05), black, [side * 0.19, 1.3, 0.46]);
      brow.rotation.z = side * -0.2;
      const arm = addMesh(this.root, new THREE.CapsuleGeometry(0.08, 0.24, 3, 6), patty, [side * 0.66, 0.75, 0]);
      arm.rotation.z = side * 0.45;
      addMesh(this.root, new THREE.CapsuleGeometry(0.09, 0.18, 3, 6), patty, [side * 0.32, 0.18, 0]);
    }
    addMesh(this.root, new THREE.SphereGeometry(0.075, 7, 6), black, [0, 0.83, 0.47], [1.25, 0.7, 0.5]);
  }
}

export function createEnemyModel(kind: EnemyKind): EnemyModel {
  if (kind === "hotdog") return new HotDogModel();
  if (kind === "burger") return new BurgerModel();
  return new DonutModel();
}

export function makeCoin() {
  const root = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffbf24, metalness: 0.55, roughness: 0.32, flatShading: true });
  const edge = new THREE.MeshStandardMaterial({ color: 0xffe580, metalness: 0.42, roughness: 0.4 });
  addMesh(root, new THREE.CylinderGeometry(0.24, 0.24, 0.09, 12), gold, [0, 0, 0]);
  addMesh(root, new THREE.CylinderGeometry(0.14, 0.14, 0.095, 10), edge, [0, 0.015, 0]);
  return root;
}
