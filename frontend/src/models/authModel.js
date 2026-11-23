/**
 * Auth Model: session lookup, login, registration, OTP verification, password reset, and logout.
 */
import { api } from './httpClient.js';

export const fetchCurrentUser = async () => {
  const me = await api('/auth/me');
  return me?.user || me;
};

export const loginAccount = (email, password) =>
  api('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

export const registerAccount = ({ email, password, name, phone }) =>
  api('/auth/register', {
    method: 'POST',
    body: { email, password, name, phone },
  });

export const verifyAccount = ({ email, code, password }) =>
  api('/auth/verify', {
    method: 'POST',
    body: {
      email,
      code,
      ...(password !== undefined ? { password } : {}),
    },
  });

export const forgotPassword = (email) =>
  api('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });

export const resendOtp = (email, isReset = false) =>
  api(isReset ? '/auth/forgot-password' : '/auth/resend-otp', {
    method: 'POST',
    body: { email },
  });

export const resetPassword = ({ email, code, password }) =>
  api('/auth/reset-password', {
    method: 'POST',
    body: { email, code, password },
  });

export const logoutAccount = () => api('/auth/logout', { method: 'POST' });

export const resolvePostAuthRoute = (nextParam, role) =>
  nextParam?.startsWith('/') &&
  !nextParam.startsWith('//') &&
  !nextParam.includes('\\')
    ? nextParam
    : ['admin', 'staff'].includes(role)
      ? '/admin'
      : '/';
