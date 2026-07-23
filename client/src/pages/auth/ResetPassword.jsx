import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/axios.js';
import AuthLayout from '../../components/layout/AuthLayout.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ password }) => {
    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password updated! Log in with your new password.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid link" subtitle="This reset link is missing or malformed.">
        <Link to="/forgot-password">
          <Button className="w-full">Request a new link</Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Make it strong — at least 8 characters">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New password"
          type="password"
          icon={Lock}
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
        <Input
          label="Confirm password"
          type="password"
          icon={Lock}
          error={errors.confirm?.message}
          {...register('confirm', {
            validate: (v) => v === watch('password') || 'Passwords do not match',
          })}
        />
        <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
