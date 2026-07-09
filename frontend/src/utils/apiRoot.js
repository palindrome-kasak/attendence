export function getApiRoot() {
  return (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
}

export function apiUrl(path) {
  const root = getApiRoot();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${root}${normalized}`;
}
