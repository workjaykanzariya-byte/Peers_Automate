// DOOT — Typed API Client

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  correlationId?: string;
}

class ApiClient {
  private activeTenantId: string | null = null;

  setActiveTenantId(tenantId: string | null) {
    this.activeTenantId = tenantId;
    if (tenantId) {
      localStorage.setItem('doot_active_tenant_id', tenantId);
    } else {
      localStorage.removeItem('doot_active_tenant_id');
    }
  }

  getActiveTenantId(): string | null {
    if (!this.activeTenantId) {
      this.activeTenantId = localStorage.getItem('doot_active_tenant_id');
    }
    return this.activeTenantId;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const tenantId = this.getActiveTenantId();
    if (tenantId && !headers['X-Tenant-Id']) {
      headers['X-Tenant-Id'] = tenantId;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Includes HttpOnly cookies
    });

    if (!response.ok) {
      let errorBody: ApiError;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = {
          statusCode: response.status,
          message: response.statusText || 'An unexpected error occurred',
          error: 'HttpError',
        };
      }
      throw errorBody;
    }

    // Return empty for 204
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
