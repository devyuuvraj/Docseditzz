import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { bootstrapSession, clearCredentials, setCredentials } from './features/auth/authSlice.js';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import AdminRoute from './components/layout/AdminRoute.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import PageLoader from './components/ui/PageLoader.jsx';

// Public
const Landing = lazy(() => import('./pages/Landing.jsx'));
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Register = lazy(() => import('./pages/auth/Register.jsx'));
const VerifyOtp = lazy(() => import('./pages/auth/VerifyOtp.jsx'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword.jsx'));
const SharedFile = lazy(() => import('./pages/SharedFile.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// App
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const MyFiles = lazy(() => import('./pages/MyFiles.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

// Tools
const ImagesToPdf = lazy(() => import('./pages/tools/ImagesToPdf.jsx'));
const ConvertToPdf = lazy(() => import('./pages/tools/ConvertToPdf.jsx'));
const PdfToWord = lazy(() => import('./pages/tools/PdfToWord.jsx'));
const ImageCropper = lazy(() => import('./pages/tools/ImageCropper.jsx'));
const Summarizer = lazy(() => import('./pages/tools/Summarizer.jsx'));
const PdfEditor = lazy(() => import('./pages/tools/PdfEditor.jsx'));
const PdfTools = lazy(() => import('./pages/tools/PdfTools.jsx'));
const OcrTool = lazy(() => import('./pages/tools/OcrTool.jsx'));
const ChatWithPdf = lazy(() => import('./pages/tools/ChatWithPdf.jsx'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminDocuments = lazy(() => import('./pages/admin/AdminDocuments.jsx'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs.jsx'));
const AdminSubscriptions = lazy(() => import('./pages/admin/AdminSubscriptions.jsx'));

export default function App() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isBootstrapping } = useSelector((s) => s.auth);

  useEffect(() => {
    dispatch(bootstrapSession());

    const onLogout = () => {
      dispatch(clearCredentials());
      navigate('/login');
    };
    const onRefreshed = (e) => dispatch(setCredentials(e.detail));

    window.addEventListener('auth:logout', onLogout);
    window.addEventListener('auth:refreshed', onRefreshed);
    return () => {
      window.removeEventListener('auth:logout', onLogout);
      window.removeEventListener('auth:refreshed', onRefreshed);
    };
  }, [dispatch, navigate]);

  if (isBootstrapping) return <PageLoader fullscreen />;

  return (
    <Suspense fallback={<PageLoader fullscreen />}>
      <Routes>
        {/* Marketing (optional) */}
        <Route path="/welcome" element={<Landing />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
        <Route path="/verify-otp" element={<Navigate to="/dashboard" replace />} />
        <Route path="/forgot-password" element={<Navigate to="/dashboard" replace />} />
        <Route path="/reset-password" element={<Navigate to="/dashboard" replace />} />
        <Route path="/s/:token" element={<SharedFile />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Authenticated app */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/files" element={<MyFiles />} />
            <Route path="/files/folder/:folderId" element={<MyFiles />} />
            <Route path="/favorites" element={<MyFiles view="favorites" />} />
            <Route path="/trash" element={<MyFiles view="trash" />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />

            <Route path="/tools/images-to-pdf" element={<ImagesToPdf />} />
            <Route path="/tools/convert-to-pdf" element={<ConvertToPdf />} />
            <Route path="/tools/pdf-to-word" element={<PdfToWord />} />
            <Route path="/tools/cropper" element={<ImageCropper />} />
            <Route path="/tools/summarizer" element={<Summarizer />} />
            <Route path="/tools/pdf-tools" element={<PdfTools />} />
            <Route path="/tools/ocr" element={<OcrTool />} />
            <Route path="/tools/chat" element={<ChatWithPdf />} />

            {/* Admin */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/documents" element={<AdminDocuments />} />
              <Route path="/admin/logs" element={<AdminLogs />} />
              <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            </Route>
          </Route>

          {/* Full-bleed editor (no dashboard chrome) */}
          <Route path="/editor" element={<PdfEditor />} />
          <Route path="/editor/:documentId" element={<PdfEditor />} />
        </Route>

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
