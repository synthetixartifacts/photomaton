interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  skipAuth?: boolean;
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultRetries: number;
  private defaultRetryDelay: number;

  constructor(baseUrl = '', defaultTimeout = 30000, defaultRetries = 3, defaultRetryDelay = 1000) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = defaultTimeout;
    this.defaultRetries = defaultRetries;
    this.defaultRetryDelay = defaultRetryDelay;
  }

  private async fetchWithTimeout(url: string, config: RequestConfig = {}): Promise<Response> {
    const timeout = config.timeout || this.defaultTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...config,
        credentials: 'include', // Always include cookies for session management
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  private async retryRequest(
    url: string,
    config: RequestConfig = {}
  ): Promise<Response> {
    const retries = config.retries ?? this.defaultRetries;
    const retryDelay = config.retryDelay ?? this.defaultRetryDelay;
    let lastError: Error | null = null;

    for (let i = 0; i <= retries; i++) {
      try {
        const response = await this.fetchWithTimeout(url, config);

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry on server errors (5xx)
        if (response.status >= 500 && i < retries) {
          await this.sleep(retryDelay * Math.pow(2, i)); // Exponential backoff
          continue;
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (i < retries) {
          console.warn(`Request failed, retrying (${i + 1}/${retries})...`, error);
          await this.sleep(retryDelay * Math.pow(2, i));
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    // Don't handle 401 here - let the AuthContext and ProtectedRoute handle authentication
    // Just throw an error and let the calling code decide what to do
    if (!response.ok) {
      const error = await this.parseError(response);
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response.text() as any;
  }

  private async parseError(response: Response): Promise<ApiError> {
    try {
      const data = await response.json();
      return {
        message: data.error || data.message || 'Request failed',
        code: data.code,
        status: response.status,
        details: data.details || data,
      };
    } catch {
      return {
        message: `Request failed with status ${response.status}`,
        status: response.status,
      };
    }
  }

  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.retryRequest(url, config);
    return this.handleResponse<T>(response);
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    const headers: HeadersInit = {};
    let body: any;

    if (data instanceof FormData) {
      body = data;
    } else if (data) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }

    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      headers: { ...headers, ...config?.headers },
      body,
    });
  }

  async put<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    const headers: HeadersInit = {};
    let body: any;

    if (data instanceof FormData) {
      body = data;
    } else if (data) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }

    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      headers: { ...headers, ...config?.headers },
      body,
    });
  }

  async patch<T>(
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<T> {
    const headers = { 'Content-Type': 'application/json' };
    const body = data ? JSON.stringify(data) : undefined;

    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      headers: { ...headers, ...config?.headers },
      body,
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  async upload<T>(
    endpoint: string,
    file: File | Blob,
    additionalData?: Record<string, string>,
    config?: RequestConfig
  ): Promise<T> {
    const formData = new FormData();
    formData.append('image', file);  // Changed from 'file' to 'image' to match server

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return this.post<T>(endpoint, formData, config);
  }

  async postFormData<T>(
    endpoint: string,
    formData: FormData,
    config?: RequestConfig
  ): Promise<T> {
    return this.post<T>(endpoint, formData, config);
  }
}

// Create default instance
export const apiClient = new ApiClient('/api');