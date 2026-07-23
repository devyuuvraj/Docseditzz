import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User, Lock, CreditCard, Camera, Check } from 'lucide-react';
import api, { apiErrorMessage } from '../lib/axios.js';
import { setUser } from '../features/auth/authSlice.js';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import { formatBytes } from '../lib/utils.js';

const PLAN_FEATURES = {
  free: ['500MB storage', '10 AI actions/day', 'All PDF tools'],
  pro: ['10GB storage', '200 AI actions/day', 'Version history', 'Priority support'],
  business: ['50GB storage', '1000 AI actions/day', 'Admin analytics', 'SLA support'],
};

export default function Profile() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const subscription = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.get('/users/me/subscription').then((r) => r.data.data),
  });

  const profileForm = useForm({ defaultValues: { name: user?.name || '' } });
  const passwordForm = useForm();

  const saveProfile = async (values) => {
    try {
      const form = new FormData();
      form.append('name', values.name);
      if (avatarFile) form.append('avatar', avatarFile);
      const { data } = await api.patch('/users/me', form);
      dispatch(setUser(data.data.user));
      setAvatarFile(null);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const changePassword = async (values) => {
    try {
      await api.patch('/users/me/password', values);
      toast.success('Password changed');
      passwordForm.reset();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const changePlan = async (plan) => {
    try {
      const { data } = await api.post('/users/me/subscription', { plan });
      dispatch(setUser(data.data.user));
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['storage'] });
      toast.success(data.message);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  const onAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">Profile</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile info */}
        <Card>
          <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
            <User className="h-4 w-4 text-brand-500" /> Personal information
          </h2>
          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {avatarPreview || user?.avatar ? (
                  <img
                    src={avatarPreview || user.avatar}
                    alt=""
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-black text-white">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <label className="absolute -bottom-1.5 -right-1.5 cursor-pointer rounded-lg bg-white p-1.5 shadow-md dark:bg-surface-700">
                  <Camera className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
                  <input type="file" accept="image/*" className="hidden" onChange={onAvatarSelect} />
                </label>
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">{user?.name}</p>
                <p className="text-sm text-slate-400">{user?.email}</p>
                <Badge variant="brand" className="mt-1 capitalize">{user?.plan} plan</Badge>
              </div>
            </div>

            <Input
              label="Full name"
              error={profileForm.formState.errors.name?.message}
              {...profileForm.register('name', { required: 'Name is required' })}
            />
            <Button type="submit" loading={profileForm.formState.isSubmitting}>
              Save changes
            </Button>
          </form>
        </Card>

        {/* Password */}
        <Card>
          <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
            <Lock className="h-4 w-4 text-brand-500" /> Password
          </h2>
          <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4">
            {user?.provider !== 'google' && (
              <Input
                label="Current password"
                type="password"
                error={passwordForm.formState.errors.currentPassword?.message}
                {...passwordForm.register('currentPassword', { required: 'Required' })}
              />
            )}
            <Input
              label="New password"
              type="password"
              error={passwordForm.formState.errors.newPassword?.message}
              {...passwordForm.register('newPassword', {
                required: 'Required',
                minLength: { value: 8, message: 'At least 8 characters' },
                validate: {
                  hasLetter: (v) => /[A-Za-z]/.test(v) || 'Must contain a letter',
                  hasNumber: (v) => /\d/.test(v) || 'Must contain a number',
                },
              })}
            />
            <Button type="submit" loading={passwordForm.formState.isSubmitting}>
              Update password
            </Button>
          </form>
        </Card>
      </div>

      {/* Subscription */}
      <Card>
        <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
          <CreditCard className="h-4 w-4 text-brand-500" /> Subscription
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {['free', 'pro', 'business'].map((plan) => {
            const isCurrent = user?.plan === plan;
            const prices = { free: 0, pro: 9, business: 29 };
            return (
              <div
                key={plan}
                className={`rounded-2xl border p-5 ${
                  isCurrent
                    ? 'border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/30'
                    : 'border-slate-200 dark:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold capitalize text-slate-800 dark:text-white">{plan}</p>
                  {isCurrent && <Badge variant="brand">Current</Badge>}
                </div>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                  ${prices[plan]}<span className="text-xs font-normal text-slate-400">/mo</span>
                </p>
                <ul className="mt-3 space-y-1.5">
                  {PLAN_FEATURES[plan].map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Check className="h-3 w-3 text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <Button
                    variant={plan === 'free' ? 'secondary' : 'primary'}
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => changePlan(plan)}
                  >
                    {plan === 'free' ? 'Downgrade' : 'Upgrade'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {subscription.data?.subscription?.expiresAt && (
          <p className="mt-4 text-xs text-slate-400">
            Current period ends {new Date(subscription.data.subscription.expiresAt).toLocaleDateString()}
          </p>
        )}
      </Card>
    </div>
  );
}
