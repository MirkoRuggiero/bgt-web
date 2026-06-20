import type { AuthResponse, RegisterRequest } from '../types';

function getAuthHeaders(username: string, password: string): HeadersInit {
  return {
    'Authorization': 'Basic ' + btoa(`${username}:${password}`),
    'Content-Type': 'application/json',
  };
}

export async function fetchMe(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/me', {
    headers: getAuthHeaders(username, password),
  });
  if (!res.ok) {
    throw new Error('Unauthorized');
  }
  return res.json();
}

export async function register(body: RegisterRequest): Promise<AuthResponse> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 409) {
    throw new Error('Username already taken');
  }
  if (!res.ok) {
    throw new Error('Registration failed');
  }
  return res.json();
}
