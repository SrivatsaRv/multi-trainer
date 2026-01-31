/**
 * Session Management Utilities
 * Handles JWT token storage and validation
 */

const TOKEN_KEY = "token";

export interface SessionData {
    userId: string;
    exp: number;
}

/**
 * Store authentication token
 */
export function setAuthToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Get authentication token
 */
export function getAuthToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

/**
 * Remove authentication token
 */
export function clearAuthToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    const token = getAuthToken();
    if (!token) return false;

    try {
        const session = decodeToken(token);
        if (isTokenExpired(session)) {
            clearAuthToken();
            return false;
        }
        return true;
    } catch {
        clearAuthToken();
        return false;
    }
}

/**
 * Decode JWT token
 */
export function decodeToken(token: string): SessionData {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return {
        userId: decoded.sub,
        exp: decoded.exp,
    };
}

/**
 * Check if token is expired
 */
export function isTokenExpired(session: SessionData): boolean {
    const now = Math.floor(Date.now() / 1000);
    return session.exp < now;
}

/**
 * Get session data from token
 */
export function getSession(): SessionData | null {
    const token = getAuthToken();
    if (!token) return null;

    try {
        const session = decodeToken(token);
        if (isTokenExpired(session)) {
            clearAuthToken();
            return null;
        }
        return session;
    } catch {
        clearAuthToken();
        return null;
    }
}
