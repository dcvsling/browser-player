export type PlayerUpdateState = "idle" | "checking" | "updating" | "latest" | "error";

const TIMEOUT_MS = 60_000;

function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("更新逾時，請稍後重試。")), timeoutMs);
    operation.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

function waitForWorker(worker: ServiceWorker, states: ServiceWorkerState[], timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      worker.removeEventListener("statechange", inspect);
      if (error) reject(error);
      else resolve();
    };
    const inspect = () => {
      if (worker.state === "redundant") finish(new Error("新版安裝失敗，請重試。"));
      else if (states.includes(worker.state)) finish();
    };
    const timer = setTimeout(() => finish(new Error("更新逾時，請稍後重試。")), timeoutMs);
    worker.addEventListener("statechange", inspect);
    inspect();
  });
}

// update() only finishes the network check. Installation may still be running.
export async function checkForPlayerUpdate(
  registration: ServiceWorkerRegistration,
  beforeActivate: () => void,
  onUpdating: () => void,
  timeoutMs = TIMEOUT_MS,
): Promise<"latest" | "updated"> {
  await withTimeout(registration.update(), timeoutMs);
  const installing = registration.installing;
  if (installing) {
    onUpdating();
    await waitForWorker(installing, ["installed", "activating", "activated"], timeoutMs);
  }
  const worker = registration.waiting || installing;
  if (!worker) return "latest";
  onUpdating();
  beforeActivate();
  worker.postMessage({ type: "SKIP_WAITING" });
  await waitForWorker(worker, ["activated"], timeoutMs);
  return "updated";
}

export function createPlayerUpdateAction(options: {
  getRegistration: () => Promise<ServiceWorkerRegistration | undefined>;
  beforeActivate: () => void;
  onState: (state: PlayerUpdateState, message: string) => void;
  onUpdated: () => void;
  timeoutMs?: number;
}) {
  let busy = false;
  return {
    get busy() { return busy; },
    async check() {
      if (busy) return;
      busy = true;
      options.onState("checking", "正在檢查 Player UI 版本…");
      try {
        const registration = await withTimeout(options.getRegistration(), options.timeoutMs ?? TIMEOUT_MS);
        if (!registration) throw new Error("無法啟用更新服務，請確認使用 HTTPS 並重新連線後重試。");
        const result = await checkForPlayerUpdate(
          registration,
          options.beforeActivate,
          () => options.onState("updating", "正在更新 Player UI，完成後會重新載入；設定將保留。"),
          options.timeoutMs,
        );
        if (result === "updated") options.onUpdated();
        else options.onState("latest", "Player UI 已是最新版本。");
      } catch (error) {
        const detail = error instanceof Error ? error.message : "請確認網路連線後重試。";
        options.onState("error", `檢查或更新失敗：${detail}`);
      } finally {
        busy = false;
      }
    },
  };
}
