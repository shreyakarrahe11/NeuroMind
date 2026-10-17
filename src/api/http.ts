const BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

async function refreshSession(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function http<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const doRequest = async () => {
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    return fetch(BASE + path, { ...init, headers, credentials: 'include' });
  };

  let response = await doRequest();
  if (response.status === 401 && !path.startsWith('/auth/')) {
    if (await refreshSession()) response = await doRequest();
  }

  let data: any = {};
  try { data = await response.json(); } catch { /* non-JSON response */ }
  if (!response.ok) throw new Error(data.detail || data.message || `Request failed (${response.status})`);
  return data as T;
}

export async function downloadAuthenticatedFile(path: string, filename: string): Promise<void> {
  const fetchFile = () => fetch(BASE + path, { credentials: 'include' });
  let response = await fetchFile();
  if (response.status === 401) {
    if (await refreshSession()) response = await fetchFile();
  }
  if (!response.ok) {
    let message = `Download failed (${response.status})`;
    try { message = (await response.json()).detail || message; } catch { /* non-JSON */ }
    throw new Error(message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
