import * as THREE from "three";
import { Arena } from "./Arena";
import { createEnemyModel, getBodyLabel, getBodyState, makeCoin, PlayerModel } from "./models";
import type { EnemyKind, EnemyModel } from "./models";
import { loadSave, maxUpgradeLevel, persistSave, upgradeCost } from "./SaveSystem";
import { AudioManager } from "./AudioManager";
import { CrazyGamesAdapter } from "../platform/CrazyGamesAdapter";
import type { SaveData, UpgradeId } from "./SaveSystem";
import { Hud } from "../ui/Hud";
import { loadQuality, nextQuality, pixelRatioFor, saveQuality } from "./QualitySettings";
import type { QualityPreset } from "./QualitySettings";

type GameMode = "menu" | "playing" | "paused" | "over" | "shop";
type Enemy = { model: EnemyModel; kind: EnemyKind; hp: number; active: boolean; wobble: number };
type Projectile = { mesh: THREE.Mesh; velocity: THREE.Vector3; damage: number; life: number; active: boolean };
type CoinPickup = { root: THREE.Group; age: number; value: number };

const ENEMY_STATS: Record<EnemyKind, { hp: number; speed: number; damage: number; fat: number; coins: number; unlock: number; weight: number }> = {
  donut: { hp: 3, speed: 1.18, damage: 18, fat: 6, coins: 1, unlock: 0, weight: 0.62 },
  hotdog: { hp: 4.5, speed: 1.62, damage: 14, fat: 7, coins: 2, unlock: 20, weight: 0.28 },
  burger: { hp: 8, speed: 0.92, damage: 26, fat: 12, coins: 3, unlock: 45, weight: 0.1 },
};

export class Game {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-14, 14, 10, -10, 0.1, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly pointerNdc = new THREE.Vector2();
  private readonly pointerWorld = new THREE.Vector3();
  private readonly mouseTarget = new THREE.Vector3();
  private readonly player = new PlayerModel();
  private readonly audio = new AudioManager();
  private readonly hud: Hud;
  private readonly keys = new Set<string>();
  private readonly enemies: Enemy[] = [];
  private readonly enemyPool: Enemy[] = [];
  private readonly projectiles: Projectile[] = [];
  private readonly projectilePool: Projectile[] = [];
  private readonly coins: CoinPickup[] = [];
  private readonly coinPool: CoinPickup[] = [];
  private readonly save: SaveData = loadSave();
  private mode: GameMode = "menu";
  private quality: QualityPreset = loadQuality();
  private mouseTargetActive = false;
  private fat = 84;
  private health = 100;
  private runCoins = 0;
  private bankedRunCoins = 0;
  private kills = 0;
  private reviveUsed = false;
  private runSettled = false;
  private adInProgress = false;
  private deathsSinceMidgameAd = 0;
  private elapsed = 0;
  private bestTime = this.save.bestTime;
  private spawnTimer = 1.25;
  private fireTimer = 0.35;
  private hurtTimer = 0;
  private hudTimer = 0;
  private previousFrame = 0;

  constructor(private readonly container: HTMLElement, private readonly platform: CrazyGamesAdapter) {
    const lowPowerDevice = window.matchMedia("(pointer: coarse)").matches || navigator.hardwareConcurrency <= 4;
    this.renderer = new THREE.WebGLRenderer({ antialias: !lowPowerDevice, alpha: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(pixelRatioFor(this.quality));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x8bbcf3);
    this.scene.fog = new THREE.Fog(0x8bbcf3, 31, 58);
    this.scene.add(new THREE.HemisphereLight(0xe7f4ff, 0x4b4658, 2.1));
    const sun = new THREE.DirectionalLight(0xfff3d7, 2.2);
    sun.position.set(-7, 16, 9);
    this.scene.add(sun);
    new Arena(this.scene);
    this.scene.add(this.player.root);
    this.hud = new Hud({
      start: () => this.startRun(),
      resume: () => this.resume(),
      restart: () => this.startRun(),
      menu: () => this.returnToMenu(),
      pause: () => this.togglePause(),
      shop: () => this.openShop(),
      buyUpgrade: (id) => this.buyUpgrade(id),
      revive: () => this.reviveRun(),
      quality: () => this.cycleQuality(),
    });
    this.hud.setQuality(this.quality);
    this.hud.showMenu(this.save.totalCoins);
    this.hud.render({ health: this.health, fat: this.fat, body: getBodyLabel(getBodyState(this.fat)), coins: 0, kills: 0, time: 0 });
    this.bindInput();
    window.addEventListener("resize", this.resize);
    this.resize();
    this.renderer.setAnimationLoop(this.frame);
  }

  private readonly resize = () => {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    const viewHeight = aspect < 1.25 ? 22 : 18;
    this.camera.left = (-viewHeight * aspect) / 2;
    this.camera.right = (viewHeight * aspect) / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private readonly frame = (time: number) => {
    const dt = Math.min((time - (this.previousFrame || time)) / 1000, 0.05);
    this.previousFrame = time;
    if (this.mode === "playing") this.update(dt);
    this.followCamera();
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number) {
    this.elapsed += dt;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.spawnTimer -= dt;
    this.fireTimer -= dt;
    this.hudTimer -= dt;
    this.movePlayer(dt);
    if (this.spawnTimer <= 0) {
      const cap = Math.min(14, 5 + Math.floor(this.elapsed / 14));
      if (this.enemies.length < cap) this.spawnEnemy();
      this.spawnTimer = Math.max(1.05, 2.8 - this.elapsed * 0.022);
    }
    this.updateEnemies(dt);
    this.autoFire();
    this.updateProjectiles(dt);
    this.updateCoins(dt);
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.08;
      this.renderHud();
    }
    if (this.fat >= 100 || this.health <= 0) this.finishRun();
  }

  private movePlayer(dt: number) {
    let x = 0;
    let z = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) z -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) z += 1;
    const touch = this.hud.getMove();
    x += touch.x;
    z += touch.z;
    let length = Math.hypot(x, z);
    if (length > 0.08) {
      this.mouseTargetActive = false;
    } else if (this.mouseTargetActive) {
      const dx = this.mouseTarget.x - this.player.root.position.x;
      const dz = this.mouseTarget.z - this.player.root.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.38) {
        this.mouseTargetActive = false;
      } else {
        x = dx / distance;
        z = dz / distance;
        length = 1;
      }
    }
    if (length > 1) { x /= length; z /= length; }
    const speed = 5.2 * (1 - this.fat * 0.0042) * (1 + this.save.upgrades.moveSpeedLevel * 0.06);
    this.player.root.position.x = THREE.MathUtils.clamp(this.player.root.position.x + x * speed * dt, -12.1, 12.1);
    this.player.root.position.z = THREE.MathUtils.clamp(this.player.root.position.z + z * speed * dt, -12.1, 12.1);
    if (length > 0.08) this.player.face(x, z);
    this.player.setFat(this.fat);
  }

  private spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const radius = 9 + Math.random() * 1.8;
    const x = THREE.MathUtils.clamp(this.player.root.position.x + Math.cos(angle) * radius, -12, 12);
    const z = THREE.MathUtils.clamp(this.player.root.position.z + Math.sin(angle) * radius, -12, 12);
    const kind = this.chooseEnemyKind();
    const poolIndex = this.enemyPool.findIndex((candidate) => candidate.kind === kind);
    const enemy = poolIndex >= 0 ? this.enemyPool.splice(poolIndex, 1)[0] : this.createEnemy(kind);
    enemy.kind = kind;
    enemy.active = true;
    enemy.hp = ENEMY_STATS[kind].hp;
    enemy.wobble = Math.random() * Math.PI * 2;
    enemy.model.root.visible = true;
    enemy.model.root.position.set(x, 0, z);
    this.enemies.push(enemy);
  }

  private chooseEnemyKind(): EnemyKind {
    const available = (Object.keys(ENEMY_STATS) as EnemyKind[]).filter((kind) => this.elapsed >= ENEMY_STATS[kind].unlock);
    const totalWeight = available.reduce((sum, kind) => sum + ENEMY_STATS[kind].weight, 0);
    let choice = Math.random() * totalWeight;
    for (const kind of available) {
      choice -= ENEMY_STATS[kind].weight;
      if (choice <= 0) return kind;
    }
    return "donut";
  }

  private createEnemy(kind: EnemyKind): Enemy {
    const model = createEnemyModel(kind);
    this.scene.add(model.root);
    model.root.visible = false;
    return { model, kind, hp: ENEMY_STATS[kind].hp, active: false, wobble: 0 };
  }

  private updateEnemies(dt: number) {
    const playerPosition = this.player.root.position;
    for (const enemy of this.enemies) {
      const pace = ENEMY_STATS[enemy.kind].speed + Math.min(this.elapsed * 0.01, 0.72);
      const position = enemy.model.root.position;
      const dx = playerPosition.x - position.x;
      const dz = playerPosition.z - position.z;
      const distance = Math.hypot(dx, dz) || 1;
      position.x += (dx / distance) * pace * dt;
      position.z += (dz / distance) * pace * dt;
      enemy.wobble += dt * 5;
      enemy.model.root.position.y = Math.abs(Math.sin(enemy.wobble)) * 0.11;
      enemy.model.root.rotation.y = Math.atan2(dx, dz) + Math.sin(enemy.wobble * 0.6) * 0.07;
      if (distance < 0.96 && this.hurtTimer <= 0) {
        this.fat = Math.min(100, this.fat + ENEMY_STATS[enemy.kind].fat);
        this.health = Math.max(0, this.health - ENEMY_STATS[enemy.kind].damage);
        this.audio.play("hit");
        this.hurtTimer = 1.05;
        position.x -= (dx / distance) * 0.72;
        position.z -= (dz / distance) * 0.72;
      }
    }
  }

  private autoFire() {
    if (this.fireTimer > 0 || this.enemies.length === 0) return;
    const playerPosition = this.player.root.position;
    let target: Enemy | null = null;
    let bestDistance = 10.5;
    for (const enemy of this.enemies) {
      const distance = enemy.model.root.position.distanceTo(playerPosition);
      if (distance < bestDistance) { bestDistance = distance; target = enemy; }
    }
    if (!target) return;
    this.player.face(target.model.root.position.x - playerPosition.x, target.model.root.position.z - playerPosition.z);
    const origin = playerPosition.clone().add(new THREE.Vector3(0, 1.08, 0));
    const aim = target.model.root.position.clone().add(new THREE.Vector3(0, 0.86, 0)).sub(origin).normalize();
    const projectile = this.projectilePool.pop() ?? this.createProjectile();
    projectile.active = true;
    projectile.life = 1.2;
    projectile.damage = 1 + this.save.upgrades.damageLevel * 0.24;
    projectile.velocity.copy(aim).multiplyScalar(14);
    projectile.mesh.visible = true;
    projectile.mesh.position.copy(origin);
    this.projectiles.push(projectile);
    this.audio.play("fire");
    this.fireTimer = Math.max(0.28, 0.56 - this.save.upgrades.reloadLevel * 0.045);
  }

  private createProjectile(): Projectile {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffd64b, emissive: 0xff9e18, emissiveIntensity: 0.45 }));
    mesh.visible = false;
    this.scene.add(mesh);
    return { mesh, velocity: new THREE.Vector3(), damage: 1, life: 0, active: false };
  }

  private updateProjectiles(dt: number) {
    for (const projectile of this.projectiles) {
      projectile.life -= dt;
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      let hit = false;
      for (const enemy of this.enemies) {
        if (projectile.mesh.position.distanceTo(enemy.model.root.position.clone().add(new THREE.Vector3(0, 0.86, 0))) < 0.7) {
          enemy.hp -= projectile.damage;
          hit = true;
          if (enemy.hp <= 0) this.killEnemy(enemy);
          break;
        }
      }
      if (hit || projectile.life <= 0 || Math.abs(projectile.mesh.position.x) > 18 || Math.abs(projectile.mesh.position.z) > 18) {
        projectile.active = false;
        projectile.mesh.visible = false;
        this.projectilePool.push(projectile);
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) if (!this.projectiles[i].active) this.projectiles.splice(i, 1);
  }

  private killEnemy(enemy: Enemy) {
    enemy.active = false;
    enemy.model.root.visible = false;
    this.enemies.splice(this.enemies.indexOf(enemy), 1);
    this.enemyPool.push(enemy);
    this.kills += 1;
    this.fat = Math.max(0, this.fat - 4);
    this.audio.play("kill");
    const coin = this.coinPool.pop() ?? { root: makeCoin(), age: 0, value: 0 };
    coin.age = 0;
    coin.value = ENEMY_STATS[enemy.kind].coins;
    coin.root.visible = true;
    coin.root.position.copy(enemy.model.root.position);
    coin.root.position.y = 0.36;
    this.scene.add(coin.root);
    this.coins.push(coin);
  }

  private updateCoins(dt: number) {
    const position = this.player.root.position;
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.age += dt;
      coin.root.rotation.y += dt * 3.2;
      coin.root.position.y = 0.34 + Math.sin(coin.age * 4) * 0.09;
      const dx = position.x - coin.root.position.x;
      const dz = position.z - coin.root.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 4.3) {
        const pull = (3.4 + (1 - distance / 4.3) * 8) * dt;
        coin.root.position.x += (dx / (distance || 1)) * pull;
        coin.root.position.z += (dz / (distance || 1)) * pull;
      }
      if (distance < 0.62 || coin.age > 15) {
        if (distance < 0.62) {
          this.runCoins += coin.value;
          this.audio.play("coin");
        }
        coin.root.visible = false;
        this.scene.remove(coin.root);
        this.coinPool.push(coin);
        this.coins.splice(i, 1);
      }
    }
  }

  private followCamera() {
    const { x, z } = this.player.root.position;
    this.camera.position.set(x, 16, z + 16);
    this.camera.lookAt(x, 0, z);
  }

  private bindInput() {
    this.renderer.domElement.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointerNdc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointerNdc, this.camera);
      if (this.raycaster.ray.intersectPlane(this.groundPlane, this.pointerWorld)) {
        this.mouseTarget.set(THREE.MathUtils.clamp(this.pointerWorld.x, -12, 12), 0, THREE.MathUtils.clamp(this.pointerWorld.z, -12, 12));
        this.mouseTargetActive = true;
      }
    });
    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      this.keys.add(key);
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
      if (key === "escape" || key === "p") this.togglePause();
      if (key === "enter" && this.mode === "menu") this.startRun();
      if (key === "r" && this.mode === "over") this.startRun();
      if (key === "escape" && this.mode === "shop") this.returnToMenu();
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.key.toLowerCase()));
    window.addEventListener("blur", () => { this.keys.clear(); if (this.mode === "playing") this.pause(false); });
    document.addEventListener("visibilitychange", () => { if (document.hidden && this.mode === "playing") this.pause(false); });
  }

  private startRun() {
    if (this.adInProgress) return;
    this.settleRun();
    this.audio.unlock();
    this.clearActors();
    this.mouseTargetActive = false;
    this.mode = "playing";
    this.player.root.position.set(0, 0, 0);
    this.player.root.rotation.set(0, 0, 0);
    this.fat = 84;
    this.health = 100;
    this.runCoins = 0;
    this.bankedRunCoins = 0;
    this.kills = 0;
    this.reviveUsed = false;
    this.runSettled = false;
    this.elapsed = 0;
    this.spawnTimer = 0.9;
    this.fireTimer = 0.25;
    this.hurtTimer = 0;
    this.hud.render({ health: this.health, fat: this.fat, body: getBodyLabel(getBodyState(this.fat)), coins: 0, kills: 0, time: 0 });
    this.hud.hideOverlay();
    this.platform.gameplayStart();
  }

  private clearActors() {
    for (const enemy of this.enemies) { enemy.active = false; enemy.model.root.visible = false; this.enemyPool.push(enemy); }
    this.enemies.length = 0;
    for (const projectile of this.projectiles) { projectile.active = false; projectile.mesh.visible = false; this.projectilePool.push(projectile); }
    this.projectiles.length = 0;
    for (const coin of this.coins) {
      coin.root.visible = false;
      this.scene.remove(coin.root);
      this.coinPool.push(coin);
    }
    this.coins.length = 0;
  }

  private pause(reportToPlatform = true) {
    if (this.mode !== "playing") return;
    this.mode = "paused";
    if (reportToPlatform) this.platform.gameplayStop();
    this.hud.showPaused();
  }

  private resume() {
    if (this.mode !== "paused") return;
    this.mode = "playing";
    this.hud.hideOverlay();
    this.platform.gameplayStart();
  }

  private togglePause() {
    if (this.mode === "playing") this.pause();
    else if (this.mode === "paused") this.resume();
  }

  private finishRun() {
    if (this.mode !== "playing") return;
    this.mode = "over";
    this.platform.gameplayStop();
    this.audio.play("death");
    this.bestTime = Math.max(this.bestTime, this.elapsed);
    this.save.bestTime = this.bestTime;
    this.settleRun();
    persistSave(this.save);
    this.hud.render({ health: this.health, fat: this.fat, body: getBodyLabel(getBodyState(this.fat)), coins: this.runCoins, kills: this.kills, time: this.elapsed });
    this.deathsSinceMidgameAd += 1;
    const adAvailable = this.platform.isRewardedAdAvailable();
    const forcedMidgame = adAvailable && this.deathsSinceMidgameAd % 2 === 0;
    const canRevive = !forcedMidgame && !this.reviveUsed && adAvailable;
    this.hud.showResult({ time: this.elapsed, kills: this.kills, coins: this.runCoins, bestTime: this.bestTime }, canRevive);
    if (forcedMidgame) {
      this.adInProgress = true;
      this.hud.setAdLoading(true);
      void this.platform.showMidgameAd(() => this.audio.suspend(), () => this.audio.resume()).then(() => {
        this.adInProgress = false;
        this.hud.setAdLoading(false);
      });
    }
  }

  private returnToMenu() {
    if (this.adInProgress) return;
    this.settleRun();
    this.clearActors();
    this.mode = "menu";
    this.hud.showMenu(this.save.totalCoins);
  }

  private openShop() {
    if (this.adInProgress) return;
    this.settleRun();
    this.mode = "shop";
    this.hud.showShop(this.save);
  }

  private settleRun() {
    if (this.runSettled) return;
    const reward = Math.max(0, this.runCoins - this.bankedRunCoins);
    this.save.totalCoins += reward;
    this.bankedRunCoins = this.runCoins;
    this.runSettled = true;
    persistSave(this.save);
  }

  private reviveRun() {
    if (this.mode !== "over" || this.reviveUsed || this.adInProgress || !this.platform.isRewardedAdAvailable()) return;
    this.adInProgress = true;
    this.hud.setAdLoading(true);
    void this.platform.showRewardedAd(() => this.audio.suspend(), () => this.audio.resume()).then((watched) => {
      this.adInProgress = false;
      this.hud.setAdLoading(false);
      if (watched && this.mode === "over") {
        this.mode = "playing";
        this.reviveUsed = true;
        this.runSettled = false;
        this.health = 58;
        this.fat = Math.max(38, this.fat - 24);
        this.hurtTimer = 1.8;
        this.fireTimer = 0.3;
        this.player.setFat(this.fat);
        this.renderHud();
        this.hud.hideOverlay();
        this.platform.gameplayStart();
      } else {
        this.hud.showResult({ time: this.elapsed, kills: this.kills, coins: this.runCoins, bestTime: this.bestTime }, false);
      }
    });
  }

  private buyUpgrade(id: UpgradeId) {
    const level = this.save.upgrades[id];
    if (level >= maxUpgradeLevel()) return;
    const cost = upgradeCost(level);
    if (this.save.totalCoins < cost) return;
    this.save.totalCoins -= cost;
    this.save.upgrades[id] = level + 1;
    persistSave(this.save);
    this.hud.showShop(this.save);
  }

  private cycleQuality() {
    this.quality = nextQuality(this.quality);
    saveQuality(this.quality);
    this.renderer.setPixelRatio(pixelRatioFor(this.quality));
    this.resize();
    this.hud.setQuality(this.quality);
  }

  private renderHud() {
    this.hud.render({ health: this.health, fat: this.fat, body: getBodyLabel(getBodyState(this.fat)), coins: this.runCoins, kills: this.kills, time: this.elapsed });
  }
}
