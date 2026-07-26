import { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../../lib/axios.js';
import { setCredentials } from '../../features/auth/authSlice.js';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import Button from '../../components/ui/Button.jsx';

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const email = location.state?.email;

  const [digits, setDigits] = useState(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState(location.state?.devOtp || null);
  const inputs = useRef([]);

  useEffect(() => {
    if (!email) navigate('/signup', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleChange = (i, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[i] = value;
    setDigits(next);
    if (value && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setDigits(text.split(''));
      inputs.current[5]?.focus();
    }
  };

  const submit = async () => {
    const otp = digits.join('');
    if (otp.length !== 6) return toast.error('Enter the 6-digit code');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp });
      dispatch(setCredentials(data.data));
      toast.success('Email verified — welcome aboard!');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      const { data } = await api.post('/auth/resend-otp', { email });
      if (data.data?.devOtp) setDevOtp(data.data.devOtp);
      toast.success('New code sent');
      setCooldown(45);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <AuthLayout title="Check your email" subtitle={`We sent a 6-digit code to ${email || 'your email'}`}>
      {devOtp && (
        <button
          type="button"
          onClick={() => setDigits(String(devOtp).split(''))}
          className="mb-5 w-full rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-center text-sm text-amber-700 transition-colors hover:bg-amber-400/20 dark:text-amber-300"
        >
          <span className="font-bold">Dev mode</span> — email isn't configured, your code is{' '}
          <span className="font-black tracking-widest">{devOtp}</span>
          <span className="mt-0.5 block text-xs opacity-70">(tap to autofill)</span>
        </button>
      )}
      <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            maxLength={1}
            autoFocus={i === 0}
            className="h-14 w-11 rounded-xl border border-slate-300 bg-white text-center text-xl font-bold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        ))}
      </div>

      <Button onClick={submit} loading={loading} className="mt-6 w-full" size="lg">
        Verify email
      </Button>

      <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
        Didn't receive it?{' '}
        <button
          onClick={resend}
          disabled={cooldown > 0}
          className="font-semibold text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-300"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </p>
    </AuthLayout>
  );
}
