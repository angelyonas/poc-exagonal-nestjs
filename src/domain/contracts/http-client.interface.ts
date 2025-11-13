/**
 * HTTP configuration options
 */
export interface IHttpConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

/**
 * HTTP response structure
 */
export interface IHttpResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

/**
 * HTTP Client interface
 * Abstraction for making HTTP requests
 * Implementations must handle retries and error handling
 */
export interface IHttpClient {
  /**
   * Perform GET request
   */
  get<T>(url: string, config?: IHttpConfig): Promise<IHttpResponse<T>>;

  /**
   * Perform POST request
   */
  post<T>(
    url: string,
    data?: unknown,
    config?: IHttpConfig,
  ): Promise<IHttpResponse<T>>;

  /**
   * Perform PUT request
   */
  put<T>(
    url: string,
    data?: unknown,
    config?: IHttpConfig,
  ): Promise<IHttpResponse<T>>;

  /**
   * Perform DELETE request
   */
  delete<T>(url: string, config?: IHttpConfig): Promise<IHttpResponse<T>>;

  /**
   * Perform PATCH request
   */
  patch<T>(
    url: string,
    data?: unknown,
    config?: IHttpConfig,
  ): Promise<IHttpResponse<T>>;
}
