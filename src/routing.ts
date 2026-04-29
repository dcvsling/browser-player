const ROUTE_SUFFIXES = [
  "/auth/index.html",
  "/auth",
  "/index.html",
  "/player",
  "/playlist",
  "/schedule",
  "/settings",
  "/404.html",
];

export function normalizePath(pathname) {
  const source = String(pathname || "").trim();
  if (!source || source === "/") return "/";
  const normalized = source.startsWith("/") ? source : `/${source}`;
  return normalized.endsWith("/") && normalized.length > 1 ? normalized.slice(0, -1) : normalized;
}

export function normalizeRoute(pathname) {
  const normalizedPath = normalizePath(pathname);
  if (normalizedPath === "/playlist") return "/playlist";
  if (normalizedPath === "/schedule") return "/schedule";
  if (normalizedPath === "/settings") return "/settings";
  return "/player";
}

export function detectAppBasePath(pathname = window.location.pathname) {
  const normalizedPath = normalizePath(pathname);
  for (const suffix of ROUTE_SUFFIXES) {
    if (normalizedPath === suffix) return "";
    if (normalizedPath.endsWith(suffix)) {
      return normalizedPath.slice(0, -suffix.length) || "";
    }
  }
  return normalizedPath === "/" ? "" : normalizedPath;
}

export function stripBasePath(pathname, basePath = detectAppBasePath(pathname)) {
  const normalizedPath = normalizePath(pathname);
  if (!basePath) return normalizedPath;
  if (normalizedPath === basePath) return "/";
  if (normalizedPath.startsWith(`${basePath}/`)) {
    return normalizedPath.slice(basePath.length) || "/";
  }
  return normalizedPath;
}

export function buildAppUrl(pathname, basePath = detectAppBasePath()) {
  const normalizedPath = normalizePath(pathname);
  if (!basePath) {
    return normalizedPath === "/" ? "/" : normalizedPath;
  }
  return normalizedPath === "/" ? `${basePath}/` : `${basePath}${normalizedPath}`;
}

export function resolveCurrentRoute(pathname = window.location.pathname, basePath = detectAppBasePath(pathname)) {
  return normalizeRoute(stripBasePath(pathname, basePath));
}

export function restoreGithubPagesRoute(basePath = detectAppBasePath()) {
  const url = new URL(window.location.href);
  const redirectedPath = url.searchParams.get("p");
  if (!redirectedPath) return null;
  const route = normalizeRoute(redirectedPath);
  window.history.replaceState({}, "", buildAppUrl(route, basePath));
  return route;
}
