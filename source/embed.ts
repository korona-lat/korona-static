import { EmbeddedWispResolver } from "../src/core/singlefile/wisp-resolver";
import { parseRuntimeLaunch, runtimeStatus } from "./protocol";
import { failUnproductiveRelay } from "./relay-health";
import { createReadyTransport, qualifyReadyTransport, type ReadyRuntimeTransport } from "./transport";

interface RuntimeFrame {
  element: HTMLIFrameElement;
  go(url: string): void;
}

interface RuntimeController {
  wait(): Promise<void>;
  createFrame(element: HTMLIFrameElement): RuntimeFrame;
}

interface RuntimeControllerConstructor {
  new (options: {
    serviceworker: ServiceWorker;
    transport: ReadyRuntimeTransport;
    config: { prefix: string; scramjetPath: string; injectPath: string; wasmPath: string };
  }): RuntimeController;
}

interface RuntimeLaunchGlobals {
  __KORONA_RUNTIME_LAUNCH__?: {
    target?: unknown;
    wisps?: unknown;
    apiOrigin?: unknown;
  };
}

class WispForwardingFailure extends Error {
  constructor(readonly endpoint: string, cause: unknown) {
    super(cause instanceof Error ? cause.message : "Korona runtime forwarding failed.");
  }
}

function report(status: Parameters<typeof runtimeStatus>[0], value: Record<string, unknown> = {}) {
  if (window.parent !== window) window.parent.postMessage(runtimeStatus(status, value), "*");
}

function setMessage(value: string) {
  const message = document.getElementById("runtime-message");
  if (message) message.textContent = value;
}

async function activeWorker(): Promise<ServiceWorker> {
  const container = workerContainer();
  if (!container) throw new Error("Service workers are unavailable in this browser.");
  const base = runtimeBase();
  const registration = await container.register(new URL("sw.js", base).href, { scope: base.href, updateViaCache: "none" });
  const active = registration.active;
  if (active?.state === "activated") return active;
  const worker = registration.installing ?? registration.waiting ?? active;
  if (!worker) throw new Error("Korona runtime worker did not begin installing.");
  return new Promise<ServiceWorker>((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.removeEventListener("statechange", onStateChange);
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Korona runtime worker did not activate."));
    }, 15_000);
    const onStateChange = () => {
      if (worker.state === "activated") {
        cleanup();
        resolve(worker);
      } else if (worker.state === "redundant") {
        cleanup();
        reject(new Error("Korona runtime worker became redundant."));
      }
    };
    worker.addEventListener("statechange", onStateChange);
  });
}

function workerContainer(): ServiceWorkerContainer | null {
  try {
    if (window.parent !== window && "serviceWorker" in window.parent.navigator) {
      return window.parent.navigator.serviceWorker;
    }
  } catch {
    // A cross-origin parent cannot own the portable runtime worker.
  }
  return "serviceWorker" in navigator ? navigator.serviceWorker : null;
}

function runtimeBase(): URL {
  return new URL("./", document.baseURI);
}

function runtimePath(path: string): string {
  return new URL(path, runtimeBase()).href;
}

function runtimePrefix(): string {
  return new URL("f/", runtimeBase()).pathname;
}

function injectedLaunch(): RuntimeLaunchGlobals["__KORONA_RUNTIME_LAUNCH__"] {
  return (globalThis as RuntimeLaunchGlobals).__KORONA_RUNTIME_LAUNCH__;
}

async function start() {
  const launch = parseRuntimeLaunch(location.search, injectedLaunch());
  if (!launch) throw new Error("This Korona runtime launch was invalid.");
  const frame = document.getElementById("runtime-frame") as HTMLIFrameElement | null;
  if (!frame) throw new Error("Korona runtime frame was missing.");
  setMessage("Selecting a relay…");
  report("progress", { count: 1 });
  const resolver = new EmbeddedWispResolver({ endpoints: launch.wisps });
  const { endpoint, transport } = await selectQualifiedTransport(resolver, launch.target);
  setMessage("Starting secure browser runtime…");
  report("progress", { count: 2 });
  const worker = await activeWorker();
  const controllerRuntime = (globalThis as { $scramjetController?: { Controller?: RuntimeControllerConstructor } }).$scramjetController;
  if (!controllerRuntime?.Controller) throw new Error("Korona relay controller did not load.");
  const controller = new controllerRuntime.Controller({
    serviceworker: worker,
    transport,
    config: {
      prefix: runtimePrefix(),
      scramjetPath: runtimePath("scram/scramjet.js"),
      injectPath: runtimePath("controller/controller.inject.js"),
      wasmPath: runtimePath("scram/scramjet.wasm"),
    },
  });
  await controller.wait();
  report("ready", { source: runtimeBase().origin });
  report("progress", { count: 3 });
  const runtimeFrame = controller.createFrame(frame);
  let contentTimedOut = false;
  const firstContent = window.setTimeout(() => {
    contentTimedOut = true;
    setMessage("Trying another relay…");
    failUnproductiveRelay(resolver, endpoint, report);
  }, 45_000);
  frame.addEventListener("load", () => {
    if (contentTimedOut) return;
    window.clearTimeout(firstContent);
    resolver.confirm(endpoint);
    document.getElementById("runtime-stage")?.classList.add("ready");
    report("first-content", { url: launch.target });
  }, { once: true });
  runtimeFrame.go(launch.target);
}

async function selectQualifiedTransport(
  resolver: EmbeddedWispResolver,
  target: string,
): Promise<{ endpoint: string; transport: ReadyRuntimeTransport }> {
  let lastEndpoint = "";
  let lastError: unknown = new Error("Korona runtime could not select a relay.");
  const candidates = resolver.candidates();
  if (candidates.length === 0) throw new Error("no Wisp endpoints are currently available");
  for (const endpoint of candidates) {
    try {
      const transport = await createReadyTransport(endpoint);
      await qualifyReadyTransport(transport, target);
      return { endpoint, transport };
    } catch (error) {
      resolver.reject(endpoint);
      lastEndpoint = endpoint;
      lastError = error;
    }
  }
  throw new WispForwardingFailure(lastEndpoint, lastError);
}

void start().catch((error: unknown) => {
  if (error instanceof WispForwardingFailure) {
    setMessage(error.message);
    report("wisp-failed", { endpoint: error.endpoint });
    return;
  }
  const detail = error instanceof Error ? error.message : "Korona runtime failed.";
  setMessage(detail);
  report("error", { detail });
});
