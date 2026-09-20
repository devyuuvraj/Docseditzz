import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PageLoader from '../ui/PageLoader.jsx';

/** Waits for automatic guest/session bootstrap — no login redirect. */
export default function ProtectedRoute() {
  const { isBootstrapping, isAuthenticated } = useSelector((s) => s.auth);

  if (isBootstrapping) return <PageLoader fullscreen />;
  if (!isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <p className="text-slate-600 dark:text-slate-300">
          Could not start your workspace. Refresh the page to try again.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
