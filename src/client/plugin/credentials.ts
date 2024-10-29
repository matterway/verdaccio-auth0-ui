//
// After a successful login, we are redirected to the UI with our username
// and JWT tokens. Instead of local storage, use an in-memory cache for storing
// sensitive data.
//

export interface Credentials {
  username: string;
  uiToken: string;
  npmToken: string;
}

// In-memory cache to store credentials temporarily during the session
let credentialsCache: Credentials | null = null;

export function saveCredentials(credentials: Credentials) {
  credentialsCache = credentials;
}

export function clearCredentials() {
  credentialsCache = null;
}

export function isLoggedIn(): boolean {
  return !!credentialsCache?.username && !!credentialsCache?.uiToken && !!credentialsCache?.npmToken;
}

export function validateCredentials(credentials: Partial<Credentials>): credentials is Credentials {
  return !!credentials.username && !!credentials.uiToken && !!credentials.npmToken;
}