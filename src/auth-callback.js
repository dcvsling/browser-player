import { getAccount, initAuth, login } from "./auth.js";
import { buildAppUrl, detectAppBasePath } from "./routing.js";

async function run() {
  try {
    const appBasePath = detectAppBasePath(window.location.pathname);
    await initAuth();
    if (!getAccount()) {
      await login();
      return;
    }
    window.location.replace(`${window.location.origin}${buildAppUrl("/", appBasePath)}`);
  } catch (error) {
    console.error(error);
    document.body.textContent = `登入回呼失敗：${error.message}`;
  }
}

run();
