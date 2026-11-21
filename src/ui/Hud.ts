import { maxUpgradeLevel, upgradeCost } from "../game/SaveSystem";
import type { SaveData, UpgradeId } from "../game/SaveSystem";
import type { DistrictConfig } from "../game/Districts";

export type RunSummary = { time: number; kills: number; coins: number; bestTime: number };
export type ResultDetails = { title: string; copy: string; tip: string };
type HudCallbacks = { start: () => void; resume: () => void; restart: () => void; menu: () => void; pause: () => void; shop: () => void; buyUpgrade: (id: UpgradeId) => void; revive: () => void; quality: () => void };

function required<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing HUD element: ${selector}`);
  return element;
}

export class Hud {
  private readonly overlay = required<HTMLElement>("#overlay");
  private readonly title = required<HTMLElement>("#overlay-title");
  private readonly copy = required<HTMLElement>("#overlay-copy");
  private readonly primary = required<HTMLButtonElement>("#primary-action");
  private readonly secondaryWrap = required<HTMLElement>("#secondary-action-wrap");
  private readonly secondary = required<HTMLButtonElement>("#secondary-action");
  private readonly tip = required<HTMLElement>("#overlay-tip");
  private readonly result = required<HTMLElement>("#result-stats");
  private readonly shopList = required<HTMLElement>("#shop-list");
  private readonly reviveButton = required<HTMLButtonElement>("#revive-action");
  private readonly qualityButton = required<HTMLButtonElement>("#quality-action");
  private readonly districtKicker = required<HTMLElement>("#district-kicker");
  private readonly districtName = required<HTMLElement>("#district-name");
  private readonly bossMeter = required<HTMLElement>("#boss-meter");
  private readonly bossName = required<HTMLElement>("#boss-name");
  private readonly bossHealthValue = required<HTMLElement>("#boss-health-value");
  private readonly bossHealthFill = required<HTMLElement>("#boss-health-fill");
  private readonly controlsTip = required<HTMLElement>("#controls-tip");
  private readonly joystick = required<HTMLElement>("#joystick");
  private readonly joystickKnob = required<HTMLElement>(".joystick-knob");
  private readonly healthFill = required<HTMLElement>("#health-fill");
  private readonly fatFill = required<HTMLElement>("#fat-fill");
  private readonly healthValue = required<HTMLElement>("#health-value");
  private readonly fatValue = required<HTMLElement>("#fat-value");
  private readonly bodyState = required<HTMLElement>("#body-state");
  private readonly coinValue = required<HTMLElement>("#coin-value");
  private readonly killValue = required<HTMLElement>("#kill-value");
  private readonly timeValue = required<HTMLElement>("#time-value");
  private readonly callbacks: HudCallbacks;
  private joystickInput = { x: 0, z: 0 };
  private activePointer: number | null = null;

  constructor(callbacks: HudCallbacks) {
    this.callbacks = callbacks;
    this.primary.addEventListener("click", () => {
      if (this.overlay.dataset.mode === "menu") this.callbacks.start();
      else if (this.overlay.dataset.mode === "paused") this.callbacks.resume();
      else if (this.overlay.dataset.mode === "over") this.callbacks.restart();
      else if (this.overlay.dataset.mode === "shop") this.callbacks.menu();
    });
    this.secondary.addEventListener("click", () => {
      if (this.overlay.dataset.mode === "paused") this.callbacks.restart();
      else if (this.overlay.dataset.mode === "menu" || this.overlay.dataset.mode === "over") this.callbacks.shop();
      else this.callbacks.menu();
    });
    this.reviveButton.addEventListener("click", () => this.callbacks.revive());
    this.qualityButton.addEventListener("click", () => this.callbacks.quality());
    required<HTMLButtonElement>("#pause-button").addEventListener("click", () => this.callbacks.pause());
    required<HTMLButtonElement>("#pause-touch").addEventListener("click", () => this.callbacks.pause());
    this.bindJoystick();
  }

  getMove() {
    return this.joystickInput;
  }

  render(stats: { health: number; fat: number; body: string; coins: number; kills: number; time: number }) {
    this.healthFill.style.width = `${Math.max(0, stats.health)}%`;
    this.fatFill.style.width = `${Math.max(0, stats.fat)}%`;
    this.healthValue.textContent = `${Math.ceil(stats.health)}`;
    this.fatValue.textContent = `${Math.round(stats.fat)}%`;
    this.bodyState.textContent = stats.body;
    this.coinValue.textContent = `${stats.coins}`;
    this.killValue.textContent = `${stats.kills}`;
    this.timeValue.textContent = this.formatTime(stats.time);
  }

  showMenu(save: SaveData, district: DistrictConfig, gateText: string) {
    this.showOverlay("menu");
    this.qualityButton.hidden = false;
    this.setDistrict(district);
    this.title.innerHTML = "BURGER<br /><span>BUSTER!</span>";
    this.copy.textContent = `${district.tagline} · Defeat the boss and earn your way to the next district.`;
    this.primary.innerHTML = 'START RUN <span>▶</span>';
    this.secondary.innerHTML = "UPGRADES";
    this.secondaryWrap.hidden = false;
    this.result.hidden = false;
    this.result.textContent = `BANK: ${save.totalCoins} COINS · DISTRICT ${district.id + 1} / 4`;
    this.shopList.hidden = true;
    this.reviveButton.hidden = true;
    this.tip.textContent = save.campaignComplete ? "CAMPAIGN CLEARED · REPLAY THE FINAL DISTRICT" : `NEXT EXIT REQUIRES ${gateText}`;
    this.setBossHealth("", 0, 0);
  }

  showPaused() {
    this.showOverlay("paused");
    this.qualityButton.hidden = true;
    this.title.textContent = "PAUSED";
    this.copy.textContent = "Catch your breath. The food can wait.";
    this.primary.innerHTML = 'RESUME <span>▶</span>';
    this.secondary.innerHTML = "RESTART RUN";
    this.secondaryWrap.hidden = false;
    this.result.hidden = true;
    this.shopList.hidden = true;
    this.reviveButton.hidden = true;
    this.tip.textContent = "Press ESC or P to resume";
  }

  showResult(summary: RunSummary, canRevive = false, details?: ResultDetails) {
    this.showOverlay("over");
    this.qualityButton.hidden = true;
    this.title.textContent = details?.title ?? "RUN OVER!";
    this.copy.textContent = details?.copy ?? "The snack attack got you. Gear up and go again!";
    this.primary.innerHTML = details?.title === "DISTRICT CLEARED!" ? 'ENTER NEXT DISTRICT <span>▶</span>' : 'RUN IT BACK <span>▶</span>';
    this.secondary.innerHTML = "UPGRADES";
    this.secondaryWrap.hidden = false;
    this.result.hidden = false;
    this.shopList.hidden = true;
    this.reviveButton.hidden = !canRevive;
    this.result.textContent = `SURVIVED ${this.formatTime(summary.time)}   ·   ${summary.kills} KOs   ·   ${summary.coins} COINS`;
    this.tip.textContent = details?.tip ?? `BEST RUN ${this.formatTime(summary.bestTime)}`;
  }

  setAdLoading(loading: boolean) {
    this.primary.disabled = loading;
    this.secondary.disabled = loading;
    this.reviveButton.disabled = loading;
    this.reviveButton.textContent = loading ? "LOADING AD…" : "WATCH AD · REVIVE";
  }

  setQuality(quality: string) {
    this.qualityButton.textContent = `QUALITY: ${quality.toUpperCase()}`;
    this.qualityButton.setAttribute("aria-label", `Graphics quality ${quality}. Click to change.`);
  }

  showShop(save: SaveData, districtName: string, gateText: string) {
    this.showOverlay("shop");
    this.qualityButton.hidden = true;
    this.title.textContent = "UPGRADES";
    this.copy.textContent = `BANK: ${save.totalCoins} COINS · ${districtName} · Permanent boosts for every run.`;
    this.primary.innerHTML = 'BACK TO MENU <span>↩</span>';
    this.secondaryWrap.hidden = true;
    this.result.hidden = true;
    this.shopList.hidden = false;
    this.reviveButton.hidden = true;
    this.shopList.replaceChildren();
    const upgrades: { id: UpgradeId; label: string; description: string }[] = [
      { id: "damageLevel", label: "DAMAGE", description: "Hit food harder" },
      { id: "reloadLevel", label: "FIRE RATE", description: "Shoot more often" },
      { id: "moveSpeedLevel", label: "RUN SPEED", description: "Move faster" },
    ];
    for (const upgrade of upgrades) {
      const level = save.upgrades[upgrade.id];
      const maxed = level >= maxUpgradeLevel();
      const row = document.createElement("div");
      row.className = "shop-row";
      const info = document.createElement("div");
      info.className = "shop-info";
      const name = document.createElement("strong");
      name.textContent = upgrade.label;
      const description = document.createElement("small");
      description.textContent = `${upgrade.description} · LV ${level}/${maxUpgradeLevel()}`;
      info.append(name, description);
      const button = document.createElement("button");
      button.className = "shop-buy";
      button.disabled = maxed || save.totalCoins < upgradeCost(level);
      button.textContent = maxed ? "MAX" : `${upgradeCost(level)} 🪙`;
      button.addEventListener("click", () => this.callbacks.buyUpgrade(upgrade.id));
      row.append(info, button);
      this.shopList.append(row);
    }
    this.tip.textContent = save.campaignComplete ? "CAMPAIGN CLEARED · ALL FOUR DISTRICTS CONQUERED" : `NEXT EXIT: ${gateText}`;
  }

  setDistrict(district: DistrictConfig) {
    this.districtKicker.textContent = `DISTRICT ${district.id + 1} / 4`;
    this.districtName.textContent = district.name.toUpperCase();
    this.districtName.style.color = `#${district.accent.toString(16).padStart(6, "0")}`;
  }

  setBossHealth(name: string, current: number, maximum: number) {
    const visible = Boolean(name) && maximum > 0;
    this.bossMeter.hidden = !visible;
    if (!visible) return;
    const percent = Math.max(0, Math.min(100, (current / maximum) * 100));
    this.bossName.textContent = name;
    this.bossHealthValue.textContent = `${Math.ceil(percent)}%`;
    this.bossHealthFill.style.width = `${percent}%`;
  }

  showControlsTip() {
    this.controlsTip.hidden = false;
    this.controlsTip.classList.remove("is-fading");
    this.controlsTip.classList.add("is-visible");
  }

  updateControlsTip(secondsLeft: number) {
    if (secondsLeft <= 3) this.controlsTip.classList.add("is-fading");
    if (secondsLeft <= 0) {
      this.controlsTip.hidden = true;
      this.controlsTip.classList.remove("is-visible", "is-fading");
    }
  }

  hideOverlay() {
    this.overlay.classList.add("is-hidden");
    this.overlay.setAttribute("aria-hidden", "true");
  }

  private showOverlay(mode: string) {
    this.overlay.dataset.mode = mode;
    this.overlay.setAttribute("aria-hidden", "false");
    this.overlay.classList.remove("is-hidden");
  }

  private bindJoystick() {
    const update = (event: PointerEvent) => {
      const rect = this.joystick.getBoundingClientRect();
      const radius = rect.width * 0.32;
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const length = Math.hypot(dx, dy);
      const scale = length > radius ? radius / length : 1;
      const x = dx * scale;
      const y = dy * scale;
      this.joystickInput = { x: x / radius, z: y / radius };
      this.joystickKnob.style.transform = `translate(${x}px, ${y}px)`;
    };
    this.joystick.addEventListener("pointerdown", (event: PointerEvent) => {
      event.preventDefault();
      this.activePointer = event.pointerId;
      this.joystick.setPointerCapture(event.pointerId);
      this.joystick.classList.add("is-active");
      update(event);
    });
    this.joystick.addEventListener("pointermove", (event: PointerEvent) => {
      if (event.pointerId === this.activePointer) update(event);
    });
    const reset = (event: PointerEvent) => {
      if (event.pointerId !== this.activePointer) return;
      this.activePointer = null;
      this.joystickInput = { x: 0, z: 0 };
      this.joystickKnob.style.transform = "translate(0, 0)";
      this.joystick.classList.remove("is-active");
    };
    this.joystick.addEventListener("pointerup", reset);
    this.joystick.addEventListener("pointercancel", reset);
  }

  private formatTime(seconds: number) {
    const total = Math.floor(seconds);
    return `${`${Math.floor(total / 60)}`.padStart(2, "0")}:${`${total % 60}`.padStart(2, "0")}`;
  }
}
