/**
 * Auth Controller: coordinates login, registration, OTP verification, password reset, and demo sign-in.
 */
import { useEffect, useState } from 'react';
import {
  forgotPassword,
  loginAccount,
  registerAccount,
  resendOtp,
  resetPassword,
  resolvePostAuthRoute,
  verifyAccount,
} from '../models/authModel.js';
import { useApp } from './AppContext.jsx';

const MODE_TITLES = {
  login: 'Chào bạn, lại là An Tâm.',
  register: 'Bắt đầu hành trình khỏe.',
  verify: 'Xác thực tài khoản',
  forgot: 'Tìm lại mật khẩu',
  reset: 'Tạo mật khẩu mới',
};

export function useAuthController() {
  const { route, setUser, navigate, notify, config } = useApp();
  const path = route.split('?')[0];
  const params = new URLSearchParams(route.split('?')[1]);
  const initialMode =
    path === '/register'
      ? 'register'
      : path === '/forgot-password'
        ? 'forgot'
        : path === '/verify'
          ? 'verify'
          : 'login';

  const [mode, setMode] = useState(initialMode);
  const settingPassword = mode === 'verify' && params.get('invite') === '1';
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setPassword('');
    setConfirmPassword('');
    setCode('');
    setDemoCode('');
    setError('');
    setMessage('');
    if (initialMode === 'login' || initialMode === 'register') {
      setEmail(params.get('email') || '');
      setName('');
      setPhone('');
    }
  }, [initialMode]);

  const signedIn = (result) => {
    const person = result.user || result;
    setUser(person);
    navigate(resolvePostAuthRoute(params.get('next'), person.role));
    notify(`Chào mừng ${person.name || 'bạn'} đến với An Tâm.`);
  };

  const performLogin = async (em, pw) =>
    signedIn(await loginAccount(em, pw));

  const resend = async () => {
    if (!email.trim())
      return setError('Nhập email hoặc số điện thoại để nhận mã.');
    setBusy(true);
    setError('');
    try {
      const result = await resendOtp(email, mode === 'reset');
      setCode('');
      setDemoCode(result.demoCode || '');
      setMessage(result.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (
      (['register', 'reset'].includes(mode) || settingPassword) &&
      password !== confirmPassword
    ) {
      setError('Mật khẩu nhập lại chưa khớp.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await performLogin(email, password);
      if (mode === 'register') {
        const data = await registerAccount({ email, password, name, phone });
        setEmail(data.email);
        setDemoCode(data.demoCode || '');
        setMode('verify');
        setMessage(
          data.message ||
            'Tài khoản đã được tạo. Nhập mã xác thực để kích hoạt.',
        );
      }
      if (mode === 'verify') {
        signedIn(
          await verifyAccount({
            email,
            code,
            ...(settingPassword ? { password } : {}),
          }),
        );
      }
      if (mode === 'forgot') {
        const data = await forgotPassword(email);
        setDemoCode(data.demoCode || data.otp || data.code || '');
        setMode('reset');
        setMessage(
          data.message ||
            'Nếu tài khoản tồn tại, mã đặt lại mật khẩu đã được gửi.',
        );
      }
      if (mode === 'reset') {
        await resetPassword({ email, code, password });
        setMode('login');
        setMessage('Đã đặt lại mật khẩu. Vui lòng đăng nhập.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const demoLogin = async (role) => {
    setBusy(true);
    setError('');
    const em = `${role}@antam.vn`;
    setEmail(em);
    setPassword('Demo@123');
    try {
      await performLogin(em, 'Demo@123');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const googleError =
    params.get('google') === 'error'
      ? 'Không thể đăng nhập bằng Google. Vui lòng thử lại.'
      : params.get('google') === 'link'
        ? 'Email này đã có tài khoản. Đăng nhập bằng mật khẩu và liên kết Google trong hồ sơ.'
        : '';

  return {
    config,
    mode,
    title: MODE_TITLES[mode],
    settingPassword,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    name,
    setName,
    phone,
    setPhone,
    code,
    setCode,
    demoCode,
    message,
    error: error || googleError,
    busy,
    submit,
    resend,
    demoLogin,
  };
}
