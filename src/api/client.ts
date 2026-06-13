export const AUTH_HEADER = 'Basic YWRtaW46dGVzdA==';

const TIMEOUT_MS = 15000;

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: AUTH_HEADER,
        ...(options?.body != null ? { 'Content-Type': 'application/json' } : {}),
        ...options?.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}
