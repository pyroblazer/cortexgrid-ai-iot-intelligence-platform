/**
 * API Client (lib/api-client.ts)
 *
 * WHAT: A typed HTTP client that handles all communication between the frontend and backend.
 *       It automatically adds JWT tokens to requests, handles expired tokens by refreshing them,
 *       and provides type-safe methods for GET, POST, PUT, PATCH, and DELETE requests.
 *
 * WHY IT EXISTS: Every API call in the app goes through this single client. Centralizing it here
 *               means we only have to write the authentication and error-handling logic once
 *               instead of repeating it in every component.
 *
 * JWT authentication flow (how login tokens work):
 *
 *   1. User logs in -> server returns two tokens:
 *      - Access token: short-lived (e.g., 15 minutes), sent with every API request
 *      - Refresh token: long-lived (e.g., 7 days), used ONLY to get a new access token
 *
 *   2. Every API request includes the access token in the Authorization header:
 *      "Authorization: Bearer <access_token>"
 *
 *   3. When the access token expires, the server responds with 401 Unauthorized.
 *      The API client intercepts this 401 response and automatically:
 *      a. Sends the refresh token to /api/auth/refresh
 *      b. Gets back a new access token + refresh token pair
 *      c. Retries the original request with the new access token
 *      d. If the refresh also fails, clears tokens and redirects to /login
 *
 *   4. This "transparent retry" means the user never sees a random logout
 *      when their access token expires mid-session.
 *
 * Type safety:
 *   Every method (get, post, put, etc.) accepts a generic type <T> that describes
 *   the expected response data shape. This gives TypeScript autocomplete and catch
 *   type errors at compile time, not runtime.
 *
 * API response envelope:
 *   All backend endpoints return a consistent format:
 *   - Success: { success: true, data: <actual data>, message?: "optional" }
 *   - Error:   { success: false, error: { code: "ERROR_CODE", message: "Human readable" } }
 *   The client unwraps the envelope so callers get just the data directly.
 */

// localStorage keys where the JWT tokens are stored after login.
const TOKEN_KEY = "cortexgrid_access_token";
const REFRESH_TOKEN_KEY = "cortexgrid_refresh_token";

// TypeScript types for the standardized API response envelope.
// Every API response follows one of these two shapes.

// Error response shape: something went wrong
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>; // Field-level validation errors (e.g., {"email": ["Invalid format"]})
  };
}

// Success response shape: the request worked
interface ApiSuccessResponse<T> {
  success: true;
  data: T;       // The actual payload -- type T is specified by each API call
  message?: string;
}

// Union type: an API response is either success OR error, never both
type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * ApiClient - The HTTP client class that all components use to talk to the backend.
 *
 * It's implemented as a class (rather than standalone functions) so it can maintain
 * internal state (the base URL) and expose a clean set of HTTP methods.
 *
 * A singleton instance is created at the bottom of this file and exported as `apiClient`.
 */
class ApiClient {
  private baseUrl: string;

  constructor() {
    // The backend URL comes from the environment variable, or defaults to "" (same-origin).
    // The API uses a global prefix of /api/v1, so we append it here so all endpoint
    // strings can use relative paths like /auth/login instead of /api/v1/auth/login.
    const base = process.env.NEXT_PUBLIC_API_URL || "";
    this.baseUrl = base ? `${base}/api/v1` : "/api/v1";
  }

  /**
   * Reads the access token from localStorage.
   * The "typeof window" check prevents crashes during server-side rendering (SSR),
   * because localStorage only exists in the browser.
   */
  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Reads the refresh token from localStorage.
   * Same SSR guard as getAccessToken.
   */
  private getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Saves both tokens to localStorage after login or token refresh.
   * Called by the auth store after successful login, and by refreshAccessToken().
   */
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Removes both tokens from localStorage -- used during logout.
   * After this, all API requests will be made without authentication.
   */
  clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Refreshes the access token using the refresh token.
   *
   * This is called automatically when an API request returns 401 (expired access token).
   *
   * Flow:
   *   1. Get the refresh token from localStorage
   *   2. POST it to the /api/auth/refresh endpoint
   *   3. On success: save the new token pair and return the new access token
   *   4. On failure: clear all tokens and redirect to /login (session is truly over)
   *
   * @returns The new access token, or null if refresh failed
   */
  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      // If the refresh token is also expired/invalid, the session is over.
      // Clear everything and send the user to the login page.
      if (!response.ok) {
        this.clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return null;
      }

      const result: ApiResponse<{ accessToken: string; refreshToken: string }> =
        await response.json();

      // Save the new token pair and return the new access token
      if (result.success) {
        this.setTokens(result.data.accessToken, result.data.refreshToken);
        return result.data.accessToken;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * The core request method that all HTTP methods (get, post, etc.) use internally.
   *
   * This method handles:
   *   1. Building the full URL (baseUrl + endpoint)
   *   2. Adding the JWT token to the Authorization header
   *   3. Detecting 401 responses and auto-refreshing the token
   *   4. Retrying the request after a successful refresh
   *   5. Unwrapping the API response envelope
   *   6. Throwing meaningful error messages
   *
   * @param endpoint - The API path (e.g., "/api/devices")
   * @param options - Standard fetch options (method, body, etc.)
   * @returns The data from the API response (unwrapped from the envelope)
   * @throws Error with a human-readable message if the request fails
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getAccessToken();

    // Build headers: always include Content-Type for JSON APIs.
    // Spread any custom headers passed in the options.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // If we have an access token, add it to the Authorization header.
    // "Bearer" is the standard prefix for JWT tokens in HTTP headers.
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Make the initial request
    let response = await fetch(url, {
      ...options,
      headers,
    });

    // AUTO-REFRESH LOGIC:
    // If the server says 401 (unauthorized) and we have a token,
    // it means the access token has expired. Try to refresh it.
    if (response.status === 401 && token) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        // Refresh succeeded! Retry the original request with the new token.
        headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      }
      // If refresh failed, the user was already redirected to /login by refreshAccessToken().
    }

    // After the (possibly retried) request, check for non-401 errors
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      // Try to extract a meaningful error message from the response body.
      // Fall back to a generic message with the HTTP status code.
      const errorMessage =
        errorBody?.error?.message ||
        `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    // Parse the response envelope and unwrap the data
    const result: ApiResponse<T> = await response.json();

    // If the envelope says success=false, throw the error message
    if (!result.success) {
      throw new Error(result.error.message);
    }

    // Return just the data -- callers don't need to know about the envelope
    return result.data;
  }

  // ---- Convenience methods for each HTTP verb ----
  // Each method delegates to the core request() method with the appropriate HTTP method.

  /** GET request: fetch data from the server */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  /** POST request: create a new resource or submit data */
  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /** PUT request: replace an entire resource */
  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /** PATCH request: partially update a resource */
  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /** DELETE request: remove a resource */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

// Singleton instance: the entire app shares one ApiClient.
// This ensures the token state is consistent everywhere.
export const apiClient = new ApiClient();
export { TOKEN_KEY, REFRESH_TOKEN_KEY };
