import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Mail, Lock, User } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/axios.js';
import { setCredentials } from '../../features/auth/authSlice.js';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import AuthEmailNotice from '../../components/auth/AuthEmailNotice.jsx';
import AuthGoogleNotice from '../../components/auth/AuthGoogleNotice.jsx';
import { googleAuthEnabled } from '../../lib/googleAuth.js';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';

export default function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      const { data } = await api.post('/auth/register', values);
      toast.success('Account created! Check your email for the code.');
      navigate('/verify-otp', {
        state: { email: values.email, devOtp: data.data?.devOtp },
      });
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const onGoogle = async (credentialResponse) => {
    try {
      const { data } = await api.post('/auth/google', { credential: credentialResponse.credential });
      dispatch(setCredentials(data.data));
      toast.success(`Welcome, ${data.data.user.name.split(' ')[0]}!`);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Free forever. No credit card required.">
      <AuthEmailNotice />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full name"
          icon={User}
          placeholder="Jane Doe"
          error={errors.name?.message}
          {...register('name', { required: 'Name is required', maxLength: { value: 80, message: 'Too long' } })}
        />
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
        <Input
          label="Password"
          type="password"
          icon={Lock}
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'At least 8 characters' },
            validate: {
              hasLetter: (v) => /[A-Za-z]/.test(v) || 'Must contain a letter',
              hasNumber: (v) => /\d/.test(v) || 'Must contain a number',
            },
          })}
        />

        <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        <span className="text-xs text-slate-400">or continue with</span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      </div>

      {googleAuthEnabled ? (
        <div className="flex justify-center">
          <GoogleLogin onSuccess={onGoogle} onError={() => toast.error('Google sign-in failed')} width="320" />
        </div>
      ) : (
        <AuthGoogleNotice />
      )}

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
