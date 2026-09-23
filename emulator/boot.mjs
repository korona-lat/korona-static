import { wispArrayBuffer, wispRequest } from "./wisp.mjs";

const key = window.KORONA_EMULATOR_KEY || new URLSearchParams(location.search).get("game");
const status = document.getElementById("loadingtext");
const scripts = ["assets/zip-2.4.7.min.js", "assets/md5.min.js", "uauth/uauth.js", "assets/jswindow.js", "assets/charToCodeMap.js", "assets/base.js"];
const emulatorBase = window.KORONA_EMULATOR_BASE || "/emulator/";

function loadScript(path) {
  return new Promise((resolve, reject) => {
    const element = document.createElement("script");
    element.src = `${emulatorBase}${path}`;
    element.onload = resolve;
    element.onerror = () => reject(new Error(`Could not load ${path}`));
    document.body.appendChild(element);
  });
}

try {
  if (!/^[A-Za-z0-9_-]+:\d+$/.test(key || "")) throw new Error("Invalid game link");
  let game;
  if (window.KORONA_EMULATOR_BASE) {
    const response = await fetch(`${emulatorBase}details.json`, { credentials: "omit" });
    if (!response.ok) throw new Error("Emulator catalog unavailable");
    game = (await response.json())[key];
  } else {
    const response = await fetch(`/api/games/emulator/${encodeURIComponent(key)}`, { credentials: "same-origin" });
    if (!response.ok) throw new Error("Game not found");
    game = (await response.json()).game;
  }
  if (!game || !/^[a-z0-9_]+$/.test(game.core) || !game.romUrl?.startsWith("https://gam.onl/user/")) throw new Error("Invalid game details");
  const legacy = game.engine === "legacy";
  const corePath = legacy ? `${emulatorBase}legacy/data/${game.core}_libretro.js` : `${emulatorBase}cores/${game.core}_libretro.js`;
  const coreResponse = await fetch(corePath, { method: "HEAD" });
  if (!coreResponse.ok) throw new Error(`${game.consoleName} needs a Libretro core that is not yet installed`);
  document.title = `${game.name} | Korona Emulator`;
  window.KORONA_EMULATOR_CONFIG = game;
  window.KORONA_EMULATOR_WISP = wispArrayBuffer;
  if (legacy) {
    const main = document.getElementById("mainarea");
    main.innerHTML = '<div id="game" style="width:100%;height:100%;color:#fff"></div>';
    const style = document.createElement("style");
    style.textContent = '#game #canvas{top:0!important;width:100vw!important;height:100vh!important}#game #loading{position:absolute;top:44%;width:100%;text-align:center;color:#fff;z-index:5}';
    document.head.appendChild(style);
    Object.assign(window, { EJS_player: "#game", EJS_gameUrl: game.romUrl, EJS_core: game.core, EJS_biosUrl: game.biosUrl, KORONA_EMULATOR_FETCH: wispRequest });
    await loadScript("legacy/libretro.js");
  } else {
    for (const path of scripts) await loadScript(path);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : "Emulator failed to start";
  const loading = document.getElementById("loadingdiv");
  if (loading && status) {
    loading.style.display = "block";
    status.textContent = message;
  } else {
    const alert = document.createElement("p");
    alert.textContent = message;
    alert.style.cssText = "position:absolute;top:40%;width:100%;text-align:center;color:#fff;z-index:10";
    document.getElementById("mainarea")?.appendChild(alert);
  }
  console.error(error);
}
