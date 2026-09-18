import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, CheckCircle2 } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/axios.js';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import AuthEmailNotice from '../../components/auth/AuthEmailNotice.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ email }) => {
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setDevResetUrl(data.data?.devResetUrl || null);
      setSent(true);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={sent ? undefined : "Enter your email and we'll send you a reset link"}
    >
      {sent ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {devResetUrl
              ? 'Email is not configured yet, so use the dev reset link below if this account exists.'
              : 'If that email exists, a reset link is on its way. Check your inbox (and spam folder).'}
          </p>
          {devResetUrl && (
            <a
              href={devResetUrl}
              className="mt-4 block break-all rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-800 hover:bg-amber-400/20 dark:text-amber-200"
            >
              Open password reset link (dev)
            </a>
          )}
          <Link to="/login" className="mt-6 inline-block">
            <Button variant="secondary">Back to login</Button>
          </Link>
        </div>
      ) : (
        <>
          <AuthEmailNotice />
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
          <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
            Send reset link
          </Button>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Remembered it?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
              Log in
            </Link>
          </p>
        </form>
        </>
      )}
    </AuthLayout>
  );
}
