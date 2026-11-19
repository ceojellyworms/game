import * as THREE from "three";

function material(color: number) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 });
}

function block(scene: THREE.Scene, size: [number, number, number], color: number, position: [number, number, number]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material(color));
  mesh.position.set(...position);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}

export class Arena {
  constructor(scene: THREE.Scene) {
    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(42, 42), material(0x55586a));
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.position.y = -0.08;
    scene.add(asphalt);
    const sidewalk = material(0xa9a7a9);
    const strips: [number, number, number, number][] = [
      [0, -14.5, 42, 2.2], [0, 14.5, 42, 2.2], [-14.5, 0, 2.2, 42], [14.5, 0, 2.2, 42],
    ];
    for (const [x, z, width, depth] of strips) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, depth), sidewalk);
      mesh.position.set(x, 0.02, z);
      scene.add(mesh);
    }
    for (let z = -12; z <= 12; z += 4) block(scene, [0.12, 0.025, 1.8], 0xf4c345, [0, 0.015, z]);
    for (let x = -12; x <= 12; x += 3) {
      block(scene, [1.2, 0.025, 0.15], 0xf4f0e7, [x, 0.02, -12.8]);
      block(scene, [1.2, 0.025, 0.15], 0xf4f0e7, [x, 0.02, 12.8]);
    }
    const buildingColors = [0xc47a57, 0x526b9a, 0x8372a6, 0xe0a24f, 0x598d81];
    for (let i = 0; i < 7; i++) {
      const x = -15 + i * 5;
      const h = 3.8 + (i % 3) * 1.2;
      block(scene, [3.7, h, 3.7], buildingColors[i % buildingColors.length], [x, h / 2, -18]);
      if (i % 2 === 0) block(scene, [3.7, h + 1, 3.7], buildingColors[(i + 2) % buildingColors.length], [x, (h + 1) / 2, 18]);
    }
    for (const x of [-18, 18]) {
      for (let z = -10; z <= 10; z += 7) {
        const h = 4 + ((z + 10) % 3) * 0.65;
        block(scene, [3.7, h, 3.7], buildingColors[Math.abs(z) % buildingColors.length], [x, h / 2, z]);
      }
    }

    // A simple diner sign gives the first block its American street identity.
    block(scene, [4.1, 0.55, 0.16], 0xc53b54, [0, 3.9, -15.82]);
    const signCanvas = document.createElement("canvas");
    signCanvas.width = 640;
    signCanvas.height = 128;
    const signContext = signCanvas.getContext("2d");
    if (signContext) {
      signContext.fillStyle = "#bd334d";
      signContext.fillRect(0, 0, signCanvas.width, signCanvas.height);
      signContext.fillStyle = "#fff4cc";
      signContext.font = "900 76px Trebuchet MS, sans-serif";
      signContext.textAlign = "center";
      signContext.textBaseline = "middle";
      signContext.fillText("DINER", signCanvas.width / 2, signCanvas.height / 2 + 2);
    }
    const signTexture = new THREE.CanvasTexture(signCanvas);
    signTexture.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.15, 0.62), new THREE.MeshBasicMaterial({ map: signTexture }));
    sign.position.set(0, 3.95, -15.7);
    scene.add(sign);

    for (const [x, z] of [[-11, -11], [11, -11], [-11, 11], [11, 11]] as const) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.6, 6), material(0x8a5638));
      trunk.position.set(x, 0.8, z);
      scene.add(trunk);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.78, 7, 6), material(0x56b84d));
      crown.position.set(x, 1.95, z);
      scene.add(crown);
      for (let leaf = 0; leaf < 4; leaf++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.35, 5), material(0x68c852));
        frond.position.set(x + Math.cos(leaf * 1.57) * 0.5, 2.2, z + Math.sin(leaf * 1.57) * 0.5);
        frond.rotation.z = Math.cos(leaf * 1.57) * 0.75;
        frond.rotation.x = Math.sin(leaf * 1.57) * 0.75;
        scene.add(frond);
      }
    }
  }
}
