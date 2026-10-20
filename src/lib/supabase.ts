import { getAccountWithTokens, updateAccountTokens } from './config.js';

const API_BASE = 'https://api.supabase.com';
const AUTH_BASE = 'https://api.supabase.com/gotrue';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email: string;
  };
}

export interface SupabaseProject {
  id: string;
  name: string;
  organization_id: string;
  region: string;
  status: string;
  created_at: string;
  database: {
    host: string;
    version: string;
  };
}

export interface SupabaseOrganization {
  id: string;
  name: string;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE}/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<AuthResponse>;
}

async function getValidToken(alias: string): Promise<string> {
  // Token'lar keychain'den okunur (dosyada düz metin tutulmaz)
  const account = await getAccountWithTokens(alias);
  if (!account) {
    throw new Error(
      `Account "${alias}" not found or its tokens are missing. Try: supra add ${alias}`
    );
  }

  if (Date.now() < account.expiresAt - 60_000) {
    return account.accessToken;
  }

  const res = await fetch(`${AUTH_BASE}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: account.refreshToken }),
  });

  if (!res.ok) {
    throw new Error(
      `Token refresh failed for "${alias}". Try: supra add ${alias}`
    );
  }

  const data = (await res.json()) as AuthResponse;
  await updateAccountTokens(
    alias,
    data.access_token,
    data.refresh_token,
    Date.now() + data.expires_in * 1000
  );

  return data.access_token;
}

async function apiRequest<T>(
  alias: string,
  path: string,
  method = 'GET',
  body?: unknown
): Promise<T> {
  const token = await getValidToken(alias);
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function getProjects(
  alias: string
): Promise<SupabaseProject[]> {
  return apiRequest<SupabaseProject[]>(alias, '/v1/projects');
}

export async function getOrganizations(
  alias: string
): Promise<SupabaseOrganization[]> {
  return apiRequest<SupabaseOrganization[]>(alias, '/v1/organizations');
}

export async function getProjectApiKeys(
  alias: string,
  projectRef: string
): Promise<Array<{ name: string; api_key: string }>> {
  return apiRequest(alias, `/v1/projects/${projectRef}/api-keys`);
}
