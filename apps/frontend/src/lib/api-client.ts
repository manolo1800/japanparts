import { ApiResponse, AuthTokens } from '@japonparts/shared';

function resolveApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  // Si está definido y es una URL personalizada que no sea el placeholder sin DNS
  if (envUrl && !envUrl.includes('api.japonparts.com') && envUrl !== 'http://localhost:4000') {
    return envUrl;
  }
  // En el navegador, usar la ruta relativa /api proxyeada internamente por Next.js
  if (typeof window !== 'undefined') {
    return '/api';
  }
  // En SSR dentro del contenedor Docker
  return process.env.BACKEND_INTERNAL_URL || 'http://backend:4000';
}

const API_BASE_URL = resolveApiBaseUrl();

class ApiClient {
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  public setTokens(tokens: { access_token: string; refresh_token: string }) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
  }

  public clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
  }

  private async tryRefreshToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        this.clearTokens();
        return null;
      }

      const json: ApiResponse<AuthTokens> = await res.json();
      if (json.data?.access_token) {
        this.setTokens({
          access_token: json.data.access_token,
          refresh_token: json.data.refresh_token,
        });
        return json.data.access_token;
      }
      return null;
    } catch {
      this.clearTokens();
      return null;
    }
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    let token = this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Manejar 401 con intento automático de refresh
    if (response.status === 401 && !endpoint.includes('/auth/')) {
      const newToken = await this.tryRefreshToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      } else {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }

    const text = await response.text();
    let data: ApiResponse<T>;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Error del servidor (${response.status}): ${text.slice(0, 120) || 'Respuesta no válida'}`
      );
    }

    if (!response.ok) {
      throw new Error(data.message || `Error en la petición al servidor (${response.status})`);
    }

    return data;
  }

  public get<T>(endpoint: string, params?: Record<string, any>) {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }
    return this.request<T>(url, { method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    let token = this.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (response) => {
      const text = await response.text();
      let data: ApiResponse<T>;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          `Error del servidor (${response.status}): ${text.slice(0, 120) || 'Respuesta no válida'}`
        );
      }
      if (!response.ok) {
        throw new Error(data.message || `Error en la petición al servidor (${response.status})`);
      }
      return data;
    });
  }

  public delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  public async downloadFile(
    endpoint: string,
    defaultFilename: string,
    params?: Record<string, any>,
  ): Promise<void> {
    let url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    const token = this.getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Error descargando archivo: ${response.statusText}`);
    }

    const blob = await response.blob();
    let filename = defaultFilename;
    const disposition = response.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
}

export const apiClient = new ApiClient();
