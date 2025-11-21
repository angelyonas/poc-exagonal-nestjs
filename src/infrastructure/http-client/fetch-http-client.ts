import { Injectable } from '@nestjs/common';
import type {
  IHttpClient,
  IHttpConfig,
  IHttpResponse,
} from '@/domain/contracts/http-client.interface';

/**
 * HTTP Client implementation using native fetch API
 * Includes retry logic with exponential backoff
 * Retries: 3 attempts, exponential backoff (2^attempt * 1000ms)
 */
@Injectable()
export class FetchHttpClient implements IHttpClient {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_RETRIES = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 second

  constructor(private readonly baseURL?: string) {}

  async get<T>(url: string, config?: IHttpConfig): Promise<IHttpResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: IHttpConfig,
  ): Promise<IHttpResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: IHttpConfig,
  ): Promise<IHttpResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  async delete<T>(
    url: string,
    config?: IHttpConfig,
  ): Promise<IHttpResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: IHttpConfig,
  ): Promise<IHttpResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    config?: IHttpConfig,
  ): Promise<IHttpResponse<T>> {
    const fullUrl = this.buildURL(url);
    const timeout = config?.timeout ?? this.DEFAULT_TIMEOUT;
    const maxRetries = config?.retries ?? this.DEFAULT_RETRIES;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...config?.headers,
          },
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // If response is OK or client error (4xx), don't retry
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return await this.handleResponse<T>(response);
        }

        // Server error (5xx) - retry
        throw new Error(
          `HTTP ${response.status}: ${response.statusText || 'Server Error'}`,
        );
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors or last attempt
        if (
          attempt === maxRetries ||
          (error as Error).name === 'AbortError' ||
          this.isClientError(error)
        ) {
          throw this.createHttpError(error, fullUrl, method);
        }

        // Wait before retry with exponential backoff
        await this.delay(this.RETRY_DELAY_BASE * Math.pow(2, attempt));
      }
    }

    // Should not reach here, but handle just in case
    throw this.createHttpError(
      lastError || new Error('Unknown error'),
      fullUrl,
      method,
    );
  }

  /**
   * Handle response and parse JSON
   */
  private async handleResponse<T>(
    response: Response,
  ): Promise<IHttpResponse<T>> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${response.statusText || errorText}`,
      );
    }

    let data: T;
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      data = (await response.json()) as T;
    } else {
      data = (await response.text()) as unknown as T;
    }

    // Convert Headers to plain object
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      data,
      status: response.status,
      headers,
    };
  }

  /**
   * Build full URL with base URL if provided
   */
  private buildURL(url: string): string {
    if (this.baseURL && !url.startsWith('http')) {
      return `${this.baseURL}${url.startsWith('/') ? url : `/${url}`}`;
    }
    return url;
  }

  /**
   * Check if error is a client error (4xx) that shouldn't be retried
   */
  private isClientError(error: unknown): boolean {
    const message = (error as Error).message;
    return message.includes('HTTP 4');
  }

  /**
   * Create formatted error message
   */
  private createHttpError(error: unknown, url: string, method: string): Error {
    const originalMessage = (error as Error).message;
    return new Error(
      `HTTP request failed [${method} ${url}]: ${originalMessage}`,
    );
  }

  /**
   * Delay utility for retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
