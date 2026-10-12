import axios from 'axios';
import { supabase } from './supabase';

const baseURL = process.env.EXPO_PUBLIC_API_URL;

/**
 * Axios client for the Caffin FastAPI backend. A request interceptor attaches
 * the current Supabase access token as a Bearer header on every call, so
 * callers never handle tokens directly. Tokens auto-refresh via the Supabase
 * client, so reading the session per-request always yields a fresh token.
 */
export const api = axios.create({
  baseURL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Extract a human-readable message from an axios/FastAPI error. */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
    if (err.code === 'ECONNABORTED') return 'Request timed out. Is the backend running?';
    if (!err.response) return 'Cannot reach the server. Check EXPO_PUBLIC_API_URL.';
  }
  return fallback;
}

/** True if the error is an HTTP response with the given status. */
export function isStatus(err: unknown, status: number): boolean {
  return axios.isAxiosError(err) && err.response?.status === status;
}
