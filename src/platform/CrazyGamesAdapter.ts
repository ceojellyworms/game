type AdCallbacks = {
  adStarted: () => void;
  adFinished: () => void;
  adError: (error: unknown) => void;
};

type CrazyGamesSdk = {
  init: () => Promise<void>;
  environment: string;
  game: { gameplayStart: () => void; gameplayStop: () => void };
  ad: { requestAd: (type: "rewarded" | "midgame", callbacks: AdCallbacks) => void | Promise<unknown> };
};

declare global {
  interface Window {
    CrazyGames?: { SDK?: CrazyGamesSdk };
  }
}

export class CrazyGamesAdapter {
  private sdk: CrazyGamesSdk | null = null;
  private environment = "disabled";
  private ready = false;
  private gameplayActive = false;

  async initialize() {
    try {
      const sdk = await this.loadSdk();
      if (!sdk) return;
      await sdk.init();
      this.sdk = sdk;
      this.environment = sdk.environment;
      this.ready = this.environment === "local" || this.environment === "crazygames";
      if (this.gameplayActive) sdk.game.gameplayStart();
    } catch (error) {
      console.info("CrazyGames SDK unavailable; using local platform mode.", error);
      this.ready = false;
    }
  }

  isRewardedAdAvailable() {
    // The v3 SDK does not expose a separate ad-fill readiness flag; adError reports unfilled requests.
    return this.ready && this.sdk !== null;
  }

  gameplayStart() {
    this.gameplayActive = true;
    if (this.ready && this.sdk) this.sdk.game.gameplayStart();
  }

  gameplayStop() {
    this.gameplayActive = false;
    if (this.ready && this.sdk) this.sdk.game.gameplayStop();
  }

  showRewardedAd(onStarted: () => void, onFinished: () => void): Promise<boolean> {
    return this.requestAd("rewarded", onStarted, onFinished);
  }

  showMidgameAd(onStarted: () => void, onFinished: () => void): Promise<boolean> {
    return this.requestAd("midgame", onStarted, onFinished);
  }

  private async loadSdk() {
    if (window.CrazyGames?.SDK) return window.CrazyGames.SDK;
    return new Promise<CrazyGamesSdk | null>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://sdk.crazygames.com/crazygames-sdk-v3.js";
      script.async = true;
      let settled = false;
      const finish = (sdk: CrazyGamesSdk | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve(sdk);
      };
      const timeout = window.setTimeout(() => finish(null), 4000);
      script.onload = () => finish(window.CrazyGames?.SDK ?? null);
      script.onerror = () => finish(null);
      document.head.append(script);
    });
  }

  private requestAd(type: "rewarded" | "midgame", onStarted: () => void, onFinished: () => void): Promise<boolean> {
    const sdk = this.sdk;
    if (!this.ready || !sdk) return Promise.resolve(false);
    return new Promise((resolve) => {
      let complete = false;
      const settle = (watched: boolean) => {
        if (complete) return;
        complete = true;
        onFinished();
        resolve(watched);
      };
      try {
        const pending = sdk.ad.requestAd(type, {
          adStarted: onStarted,
          adFinished: () => settle(true),
          adError: (error) => {
            console.info(`CrazyGames ${type} ad was not shown.`, error);
            settle(false);
          },
        });
        if (pending && typeof pending.then === "function") {
          void pending.catch((error: unknown) => {
            console.warn(`CrazyGames ${type} ad request failed.`, error);
            settle(false);
          });
        }
      } catch (error) {
        console.warn(`CrazyGames ${type} ad request failed.`, error);
        settle(false);
      }
    });
  }
}
