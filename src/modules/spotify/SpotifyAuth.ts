const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string
const REDIRECT_URI = import.meta.env.VITE_APP_URL
  ? `${import.meta.env.VITE_APP_URL}/callback`
  : 'http://127.0.0.1:5173/callback'

const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-library-read',
  'playlist-read-private',
  'streaming',
].join(' ')

const STORAGE_KEYS = {
  accessToken: 'vinyl_access_token',
  refreshToken: 'vinyl_refresh_token',
  expiresAt: 'vinyl_expires_at',
  codeVerifier: 'vinyl_code_verifier',
}

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return values.reduce((acc, x) => acc + possible[x % possible.length], '')
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return crypto.subtle.digest('SHA-256', data)
}

function base64urlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export async function initiateLogin(): Promise<void> {
  const codeVerifier = generateRandomString(64)
  const hashed = await sha256(codeVerifier)
  const codeChallenge = base64urlEncode(hashed)

  localStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function handleCallback(code: string): Promise<string> {
  const codeVerifier = localStorage.getItem(STORAGE_KEYS.codeVerifier)
  if (!codeVerifier) throw new Error('No code verifier found')

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  const data = await response.json()
  storeTokens(data.access_token, data.refresh_token, data.expires_in)
  localStorage.removeItem(STORAGE_KEYS.codeVerifier)

  return data.access_token
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken)
  if (!refreshToken) throw new Error('No refresh token found')

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) throw new Error('Token refresh failed')

  const data = await response.json()
  storeTokens(data.access_token, data.refresh_token ?? refreshToken, data.expires_in)
  return data.access_token
}

function storeTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
  const expiresAt = Date.now() + expiresIn * 1000
  localStorage.setItem(STORAGE_KEYS.accessToken, accessToken)
  localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken)
  localStorage.setItem(STORAGE_KEYS.expiresAt, String(expiresAt))
}

export function getStoredToken(): string | null {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken)
  const expiresAt = Number(localStorage.getItem(STORAGE_KEYS.expiresAt))
  if (!token || !expiresAt) return null
  // Consider expired 60s early
  if (Date.now() > expiresAt - 60_000) return null
  return token
}

export function isTokenExpiringSoon(): boolean {
  const expiresAt = Number(localStorage.getItem(STORAGE_KEYS.expiresAt))
  if (!expiresAt) return true
  return Date.now() > expiresAt - 5 * 60_000
}

export function clearTokens(): void {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
}
