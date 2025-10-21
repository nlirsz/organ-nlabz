import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Global 401 handler function
let onUnauthorizedCallback: (() => void) | null = null;

export const setUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// Token refresh function
const refreshToken = async (): Promise<{ accessToken: string; refreshToken: string } | null> => {
  try {
    const refreshTokenValue = localStorage.getItem("refreshToken");
    if (!refreshTokenValue) {
      return null;
    }

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Update localStorage with new tokens
    localStorage.setItem("authToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("userId", data.userId);
    localStorage.setItem("username", data.username);

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken
    };
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
};

// Enhanced error handler with 401 interceptor
async function throwIfResNotOk(res: Response, isRetry = false) {
  if (!res.ok) {
    // Handle 401 Unauthorized
    if (res.status === 401 && !isRetry) {
      console.log("🔑 401 detected - attempting token refresh");

      // Try to refresh token
      const newTokens = await refreshToken();

      if (newTokens) {
        console.log("✅ Token refreshed successfully");
        // Don't throw error - let the caller retry with new token
        return;
      } else {
        console.log("❌ Token refresh failed - clearing auth");
        // Clear auth data and trigger logout
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("username");

        // Call global unauthorized handler
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
      }
    }

    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper to check if token is about to expire (5 min buffer)
function isTokenExpiringSoon(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    return (expirationTime - now) < fiveMinutes;
  } catch {
    return false;
  }
}

// Wrapper for API requests with automatic token handling
export async function apiRequest(
  method: string,
  url: string,
  body?: any,
  options: { unauthorizedBehavior?: "returnNull" | "throw" } = {}
): Promise<Response> {
  const { unauthorizedBehavior = "throw" } = options;

  // Check if token is expiring soon and refresh proactively
  const currentToken = localStorage.getItem("authToken");
  if (currentToken && isTokenExpiringSoon(currentToken)) {
    console.log("⏰ Token expiring soon - refreshing proactively");
    const newTokens = await refreshToken();
    if (!newTokens) {
      console.log("❌ Proactive refresh failed");
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      throw new Error("Token refresh failed");
    }
  }

  const authToken = localStorage.getItem("authToken");
  const headers: Record<string, string> = {};

  if (authToken) {
    headers["x-auth-token"] = authToken;
  }

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  // Check for 401 and handle token refresh
  if (res.status === 401 && !isRetry) {
    try {
      await throwIfResNotOk(res, false);
      // If we get here, token was refreshed successfully - retry the request
      return apiRequest(method, url, body, options);
    } catch (error) {
      throw error;
    }
  }

  await throwIfResNotOk(res, isRetry);
  return res;
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authToken = localStorage.getItem("authToken");
    const headers: Record<string, string> = {};

    if (authToken) {
      headers["x-auth-token"] = authToken;
    }

    const res = await fetch(String(queryKey[0]), {
      headers,
      credentials: "include",
    });

    // Handle 401 with token refresh and retry
    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }

      console.log("🔑 401 in query - attempting token refresh");

      // Try to refresh token
      const newTokens = await refreshToken();

      if (newTokens) {
        console.log("✅ Token refreshed, retrying query");
        // Retry the request with new token
        const retryHeaders: Record<string, string> = {};
        retryHeaders["x-auth-token"] = newTokens.accessToken;

        const retryRes = await fetch(String(queryKey[0]), {
          headers: retryHeaders,
          credentials: "include",
        });

        await throwIfResNotOk(retryRes, true);
        return await retryRes.json();
      } else {
        console.log("❌ Token refresh failed in query");
        // Clear auth data and trigger logout
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userId");
        localStorage.removeItem("username");

        // Call global unauthorized handler
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});