// @ts-nocheck
import { APP_CONFIG } from "./config.js";
import { buildAppUrl, detectAppBasePath } from "./routing.js";

let msalApp;
let activeAccount = null;
let initialized = false;

const MSAL_CDN_URLS = [
  "https://alcdn.msauth.net/browser/2.39.0/js/msal-browser.min.js",
  "https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.39.0/lib/msal-browser.min.js",
  "https://unpkg.com/@azure/msal-browser@2.39.0/lib/msal-browser.min.js",
];

export async function initAuth() {
  if (initialized && msalApp) return activeAccount;
  await ensureMsalLoaded();
  const authorityTenant = resolveAuthorityTenant(
    APP_CONFIG.auth.authority || APP_CONFIG.auth.tenantId
  );
  const appBasePath = detectAppBasePath(window.location.pathname);
  const redirectUri = buildRedirectUri(APP_CONFIG.auth.redirectPath, appBasePath);
  const postLogoutRedirectUri = buildRedirectUri("/", appBasePath);

  msalApp = new window.msal.PublicClientApplication({
    auth: {
      clientId: APP_CONFIG.auth.clientId,
      authority: `https://login.microsoftonline.com/${authorityTenant}`,
      redirectUri,
      postLogoutRedirectUri,
    },
    cache: {
      cacheLocation: "localStorage",
    },
  });

  await msalApp.initialize();
  const redirectResult = await msalApp.handleRedirectPromise();
  if (redirectResult?.account) {
    activeAccount = redirectResult.account;
  }

  const accounts = msalApp.getAllAccounts();
  if (!activeAccount && accounts.length > 0) {
    activeAccount = accounts[0];
  }
  initialized = true;
  return activeAccount;
}

export function getAccount() {
  return activeAccount;
}

export async function login() {
  ensureInitialized();
  await msalApp.loginRedirect({
    scopes: APP_CONFIG.auth.scopes,
    prompt: "select_account",
  });
  return null;
}

export async function logout() {
  ensureInitialized();
  if (!activeAccount) return;
  await msalApp.logoutRedirect({ account: activeAccount });
  activeAccount = null;
}

export async function getAccessToken() {
  ensureInitialized();
  if (!activeAccount) {
    throw new Error("尚未登入，無法取得存取權杖。");
  }

  const req = {
    account: activeAccount,
    scopes: APP_CONFIG.auth.scopes,
  };

  try {
    const result = await msalApp.acquireTokenSilent(req);
    return result.accessToken;
  } catch {
    await msalApp.acquireTokenRedirect({
      scopes: APP_CONFIG.auth.scopes,
    });
    throw new Error("已重新導向進行授權，請稍候。");
  }
}

async function ensureMsalLoaded() {
  if (window.msal?.PublicClientApplication) return;

  for (const src of MSAL_CDN_URLS) {
    try {
      await loadScript(src);
      if (window.msal?.PublicClientApplication) return;
    } catch {
      // 該 CDN 失敗就嘗試下一個。
    }
  }

  throw new Error(
    "MSAL 載入失敗（所有 CDN 均無法使用）。請確認網路可連外，或將 msal-browser.min.js 放到本機並改為本地引用。"
  );
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`載入失敗: ${src}`));
    document.head.appendChild(script);
  });
}

function ensureInitialized() {
  if (!msalApp) {
    throw new Error("驗證尚未初始化完成，請重新整理後再試。");
  }
}

function resolveAuthorityTenant(rawTenantId) {
  const value = String(rawTenantId || "").trim();
  const aliasSet = new Set(["common", "consumers", "organizations"]);
  const guidPattern =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const domainPattern = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (aliasSet.has(value.toLowerCase()) || guidPattern.test(value) || domainPattern.test(value)) {
    return value;
  }

  console.warn(
    `[Auth] tenantId 格式不符合 GUID/網域，已改用 common。收到值: ${value || "(empty)"}`
  );
  return "common";
}

function buildRedirectUri(path, basePath) {
  return `${window.location.origin}${buildAppUrl(path, basePath)}`;
}



