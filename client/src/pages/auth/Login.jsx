import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Mail, Lock } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/axios.js';
import { setCredentials } from '../../features/auth/authSlice.js';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      const { data } = await api.post('/auth/login', values);
      dispatch(setCredentials(data.data));
      toast.success(`Welcome back, ${data.data.user.name.split(' ')[0]}!`);
      navigate(from, { replace: true });
    } catch (error) {
      if (error.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        toast('Verify your email first — we sent you a new code.', { icon: '📧' });
        navigate('/verify-otp', {
          state: { email: values.email, devOtp: error.response.data.data?.devOtp },
        });
        return;
      }
      toast.error(apiErrorMessage(error));
    }
  };

  const onGoogle = async (credentialResponse) => {
    try {
      const { data } = await api.post('/auth/google', { credential: credentialResponse.credential });
      dispatch(setCredentials(data.data));
      toast.success(`Welcome, ${data.data.user.name.split(' ')[0]}!`);
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your DOCSEDITZ workspace">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          icon={Mail}
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
          })}
        />
        <div>
          <Input
            label="Password"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />
          <div className="mt-1.5 text-right">
            <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
          Log in
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        <span className="text-xs text-slate-400">or continue with</span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      </div>

      <div className="flex justify-center">
        <GoogleLogin onSuccess={onGoogle} onError={() => toast.error('Google sign-in failed')} width="320" />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        New here?{' '}
        <Link to="/signup" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
