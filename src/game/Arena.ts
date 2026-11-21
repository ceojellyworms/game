import * as THREE from "three";
import type { DistrictConfig } from "./Districts";

function material(color: number, emissive = 0) {
  return new THREE.MeshStandardMaterial({ color, emissive, flatShading: true, roughness: 0.82 });
}

function block(parent: THREE.Group, size: [number, number, number], color: number, position: [number, number, number], emissive = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color, emissive));
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function makeSignTexture(label: string, accent: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const color = `#${accent.toString(16).padStart(6, "0")}`;
    ctx.fillStyle = "#28263e";
    ctx.fillRect(0, 0, 768, 192);
    ctx.fillStyle = color;
    ctx.fillRect(12, 12, 744, 168);
    ctx.strokeStyle = "#ffe29a";
    ctx.lineWidth = 7;
    ctx.strokeRect(19, 19, 730, 154);
    ctx.fillStyle = "#fff6dd";
    ctx.font = "1000 82px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#fff2c5";
    ctx.shadowBlur = 12;
    ctx.fillText(label, 384, 98, 700);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class Arena {
  readonly root = new THREE.Group();

  constructor(scene: THREE.Scene, district: DistrictConfig) {
    scene.add(this.root);
    this.buildRoad(district);
    this.buildStorefronts(district);
    this.buildStreetProps(district);
    this.buildLandmark(district);
  }

  dispose() {
    this.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const entry of materials) {
        if (entry instanceof THREE.MeshBasicMaterial && entry.map) entry.map.dispose();
        entry.dispose();
      }
    });
    this.root.removeFromParent();
  }

  private buildRoad(district: DistrictConfig) {
    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(42, 42), material(district.road));
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.y = -0.08;
    this.root.add(asphalt);

    const sidewalk = material(district.sidewalk);
    for (const [x, z, width, depth] of [
      [0, -14.5, 42, 2.2], [0, 14.5, 42, 2.2], [-14.5, 0, 2.2, 42], [14.5, 0, 2.2, 42],
    ]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, depth), sidewalk);
      mesh.position.set(x, 0.02, z);
      this.root.add(mesh);
    }

    for (let z = -12; z <= 12; z += 4) block(this.root, [0.12, 0.025, 1.8], district.id === 1 ? 0xf5d79a : 0xf4c345, [0, 0.015, z]);
    for (let x = -12; x <= 12; x += 3) {
      block(this.root, [1.2, 0.025, 0.15], 0xf4f0e7, [x, 0.02, -12.8]);
      block(this.root, [1.2, 0.025, 0.15], 0xf4f0e7, [x, 0.02, 12.8]);
    }
    for (const x of [-8, -4, 0, 4, 8]) {
      block(this.root, [0.16, 0.02, 2.1], 0xf5f1e8, [x, 0.012, -5.7]);
      block(this.root, [0.16, 0.02, 2.1], 0xf5f1e8, [x, 0.012, 5.7]);
    }

    if (district.id === 1) {
      for (let z = -10; z <= 10; z += 2) block(this.root, [25, 0.012, 0.08], 0xc7a878, [0, -0.01, z]);
      block(this.root, [0.18, 0.7, 24], 0xf3d8a4, [-12.35, 0.3, 0]);
      block(this.root, [0.18, 0.7, 24], 0xf3d8a4, [12.35, 0.3, 0]);
    }
  }

  private buildStorefronts(district: DistrictConfig) {
    const colors = district.buildingColors;
    for (let i = 0; i < 7; i++) {
      const x = -15 + i * 5;
      const height = district.id >= 2 ? 6.2 + (i % 3) * 1.8 : 3.8 + (i % 3) * 1.2;
      const color = colors[i % colors.length];
      block(this.root, [3.8, height, 3.8], color, [x, height / 2, -18]);
      this.addFacade(x, -16.07, height, color, district);
      if (i % 2 === 0) {
        block(this.root, [3.8, height + 1, 3.8], colors[(i + 2) % colors.length], [x, (height + 1) / 2, 18]);
        this.addFacade(x, 16.07, height + 1, color, district, true);
      }
    }
    for (const x of [-18, 18]) {
      for (let z = -10; z <= 10; z += 7) {
        const height = 4 + ((z + 10) % 3) * 0.65;
        block(this.root, [3.7, height, 3.7], colors[Math.abs(z) % colors.length], [x, height / 2, z]);
        for (let window = 0; window < 3; window++) {
          const faceX = x + (x < 0 ? 1.87 : -1.87);
          block(this.root, [0.05, 0.55, 0.62], district.id === 3 ? 0x63d4e0 : 0x9dc9dc, [faceX, 1.15 + window * 1.1, z]);
        }
      }
    }
  }

  private addFacade(x: number, z: number, height: number, color: number, district: DistrictConfig, reversed = false) {
    const faceZ = z + (reversed ? -0.07 : 0.07);
    const glass = material(district.id === 3 ? 0x63d4e0 : 0x9dc9dc, district.id === 3 ? 0x123849 : 0x000000);
    for (const dx of [-0.9, 0.9]) {
      for (let y = 1.45; y < height - 0.9; y += 1.18) {
        const pane = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.64, 0.06), glass);
        pane.position.set(x + dx, y, faceZ);
        this.root.add(pane);
        block(this.root, [0.82, 0.055, 0.09], 0xe5dfcf, [x + dx, y - 0.37, faceZ]);
      }
    }
    block(this.root, [1.02, 1.62, 0.12], district.id === 0 ? 0x6e4238 : 0x3f4058, [x, 0.82, faceZ]);
    block(this.root, [4.05, 0.27, 0.45], district.accent, [x, 1.75, z + (reversed ? -0.24 : 0.24)]);
    block(this.root, [3.85, 0.11, 0.48], color, [x, 1.57, z + (reversed ? -0.24 : 0.24)]);
  }

  private buildStreetProps(district: DistrictConfig) {
    for (const x of [-13.3, 13.3]) {
      for (const z of [-9, 0, 9]) {
        const lamp = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 3.4, 6), material(0x454455));
        pole.position.y = 1.7;
        lamp.add(pole);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.08), material(0x454455));
        arm.position.set(x < 0 ? 0.36 : -0.36, 3.3, 0);
        lamp.add(arm);
        const glow = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), material(0xffe5a3, district.id === 3 ? 0x8b3fba : 0x554421));
        glow.position.set(x < 0 ? 0.68 : -0.68, 3.19, 0);
        lamp.add(glow);
        lamp.position.set(x, 0, z);
        this.root.add(lamp);
      }
    }

    for (const x of [-11.1, 11.1]) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.23, 1.4, 5), material(0x8a5638));
      trunk.position.y = 0.7;
      tree.add(trunk);
      const greens = district.id === 1 ? [0x35a66a, 0x51bf79, 0x318d71] : [0x56b84d, 0x68c852, 0x438f54];
      for (let lobe = 0; lobe < 3; lobe++) {
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), material(greens[lobe]));
        crown.position.set(Math.cos(lobe * 2.1) * 0.38, 1.75 + (lobe % 2) * 0.32, Math.sin(lobe * 2.1) * 0.38);
        crown.scale.set(1, 0.95, 1);
        tree.add(crown);
      }
      for (const z of [-11, 11]) {
        const instance = tree.clone(true);
        instance.position.set(x, 0, z);
        this.root.add(instance);
      }
    }

    // Parked cars frame the playable block without obstructing the arena.
    this.addCar(-10.3, -13.7, 0x397fe4, -0.04);
    this.addCar(10.3, 13.7, 0xf5bd38, Math.PI - 0.04);
    this.addCar(9.1, -13.6, district.id === 3 ? 0xd94c9c : 0xe75b44, Math.PI + 0.03);

    if (district.id === 0) this.addDinerStreetDetails();
  }

  private addDinerStreetDetails() {
    // Small sidewalk landmarks make the diner block read as a lived-in city street.
    for (const side of [-1, 1]) {
      const hydrant = new THREE.Group();
      const red = material(0xd94b3d);
      const brass = material(0xffcf6a);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.14, 7), red);
      base.position.y = 0.12;
      hydrant.add(base);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.48, 7), red);
      barrel.position.y = 0.42;
      hydrant.add(barrel);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.2, 7), red);
      cap.position.y = 0.76;
      hydrant.add(cap);
      for (const direction of [-1, 1]) {
        const port = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 8), brass);
        port.rotation.z = Math.PI / 2;
        port.position.set(direction * 0.18, 0.43, 0);
        hydrant.add(port);
      }
      hydrant.position.set(side * 12.25, 0, side * 4.2);
      this.root.add(hydrant);

      const bench = new THREE.Group();
      const wood = material(0xb87943);
      for (let plank = 0; plank < 3; plank++) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.09, 0.16), wood);
        seat.position.set(0, 0.5, (plank - 1) * 0.17);
        bench.add(seat);
      }
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.48, 0.09), wood);
      back.position.set(0, 0.84, -0.19);
      bench.add(back);
      for (const legX of [-0.55, 0.55]) {
        block(bench, [0.09, 0.54, 0.42], 0x424557, [legX, 0.28, 0]);
      }
      bench.position.set(side * 12.15, 0, -2.1);
      bench.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      this.root.add(bench);

      const box = new THREE.Group();
      block(box, [0.58, 0.82, 0.5], side < 0 ? 0x397fe4 : 0xe75b44, [0, 0.42, 0]);
      block(box, [0.62, 0.08, 0.54], 0xffd36c, [0, 0.87, 0]);
      block(box, [0.42, 0.07, 0.025], 0xfff2d2, [0, 0.56, 0.263]);
      box.position.set(side * 12.25, 0, 7.2);
      this.root.add(box);
    }
  }

  private addCar(x: number, z: number, color: number, yaw: number) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.62, 1.12), material(color));
    body.position.y = 0.5;
    car.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.52, 0.94), material(0xa5d5e8));
    cabin.position.set(-0.12, 0.98, 0);
    car.add(cabin);
    const bumperMaterial = material(0x474758);
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 8), material(0x292934));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.72, 0.23, 0.55);
      car.add(wheel);
      const farWheel = wheel.clone();
      farWheel.position.z = -0.55;
      car.add(farWheel);
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.23), material(0xffedb4, 0x493d18));
      light.position.set(1.15, 0.52, side * 0.32);
      car.add(light);
    }
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.17, 1.12), bumperMaterial);
    bumper.position.set(-1.17, 0.36, 0);
    car.add(bumper);
    car.position.set(x, 0, z);
    car.rotation.y = yaw;
    this.root.add(car);
  }

  private buildLandmark(district: DistrictConfig) {
    const signTexture = makeSignTexture(district.sign, district.accent);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 1.33), new THREE.MeshBasicMaterial({ map: signTexture }));
    sign.position.set(0, 4.2, -15.7);
    this.root.add(sign);

    if (district.id === 0) {
      block(this.root, [5.8, 0.46, 0.42], 0xf1e5c9, [0, 3.5, -15.45]);
      block(this.root, [5.4, 0.24, 0.45], district.accent, [0, 3.2, -15.44]);
    } else if (district.id === 1) {
      for (const x of [-7, 7]) {
        const umbrella = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.48, 8), material(x < 0 ? 0xfa6e59 : 0x52b7ae));
        umbrella.position.set(x, 2.45, -10.8);
        umbrella.rotation.x = Math.PI;
        this.root.add(umbrella);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.8, 5), material(0xf4ddb0));
        stem.position.set(x, 1.52, -10.8);
        this.root.add(stem);
        block(this.root, [1.8, 0.18, 0.7], 0xe9c694, [x, 0.72, -10.8]);
      }
    } else if (district.id === 2) {
      for (const side of [-1, 1]) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(1.35, 7.2, 1.1), material(district.buildingColors[side < 0 ? 0 : 2]));
        tower.position.set(side * 6.5, 3.6, -11);
        this.root.add(tower);
        for (let row = 0; row < 7; row++) block(this.root, [1.02, 0.09, 0.08], district.accent, [side * 6.5, 0.9 + row * 0.88, -10.4], district.accent);
      }
    } else {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(5.7, 0.2, 5, 14, Math.PI), material(district.accent, district.accent));
      arch.rotation.z = Math.PI;
      arch.position.set(0, 3.7, -11.5);
      this.root.add(arch);
      block(this.root, [0.35, 4, 0.35], district.accent, [-5.55, 2, -11.5], district.accent);
      block(this.root, [0.35, 4, 0.35], district.accent, [5.55, 2, -11.5], district.accent);
    }
  }
}
