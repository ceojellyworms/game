import "./style.css";
import { Game } from "./game/Game";
import { CrazyGamesAdapter } from "./platform/CrazyGamesAdapter";

const container = document.querySelector<HTMLDivElement>("#game-view");

if (!container) {
  throw new Error("Game view container was not found.");
}

const platform = new CrazyGamesAdapter();
void platform.initialize();
new Game(container, platform);
