import { Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { bootstrapSession } from '../../features/auth/authSlice.js';
import PageLoader from '../ui/PageLoader.jsx';
import Button from '../ui/Button.jsx';

/** Waits for automatic guest/session bootstrap — no login redirect. */
export default function ProtectedRoute() {
  const dispatch = useDispatch();
  const { isBootstrapping, isAuthenticated, bootstrapError } = useSelector((s) => s.auth);

  if (isBootstrapping) return <PageLoader fullscreen />;
  if (!isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <p className="max-w-md text-slate-600 dark:text-slate-300">
          Could not start your workspace. Redeploy the Railway API from latest{' '}
          <code className="text-xs">main</code>, then try again.
        </p>
        {bootstrapError && (
          <p className="mt-2 max-w-md text-xs text-slate-500">{bootstrapError}</p>
        )}
        <Button className="mt-4" onClick={() => dispatch(bootstrapSession())}>
          Try again
        </Button>
      </div>
    );
  }

  return <Outlet />;
}
