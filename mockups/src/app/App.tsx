import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppStore } from './store';
import { ToastViewport } from '../components/ui';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { PasswordResetRequestPage } from '../pages/PasswordResetRequestPage';
import { PasswordResetResetPage } from '../pages/PasswordResetResetPage';
import { DashboardPage } from '../pages/DashboardPage';
import { MonthlyRecordPage } from '../pages/MonthlyRecordPage';
import { LifePlanPage } from '../pages/LifePlanPage';
import { SettingsPage } from '../pages/SettingsPage';

function Protected({ children }: { children: ReactElement }) {
  const { state } = useAppStore();
  if (state.auth.loggedIn === false) {
    return <Navigate replace to='/login' />;
  }
  return children;
}

export function App() {
  const { state, dismissToast } = useAppStore();

  return (
    <>
      <Routes>
        <Route path='/' element={<Navigate replace to={state.auth.loggedIn ? '/dashboard' : '/login'} />} />
        <Route path='/login' element={state.auth.loggedIn ? <Navigate replace to='/dashboard' /> : <LoginPage />} />
        <Route path='/signup' element={state.auth.loggedIn ? <Navigate replace to='/dashboard' /> : <SignupPage />} />
        <Route path='/password-reset/request' element={state.auth.loggedIn ? <Navigate replace to='/dashboard' /> : <PasswordResetRequestPage />} />
        <Route path='/password-reset/reset' element={state.auth.loggedIn ? <Navigate replace to='/dashboard' /> : <PasswordResetResetPage />} />
        <Route path='/dashboard' element={<Protected><DashboardPage /></Protected>} />
        <Route path='/monthly-record' element={<Protected><MonthlyRecordPage /></Protected>} />
        <Route path='/life-plan' element={<Protected><LifePlanPage /></Protected>} />
        <Route path='/settings' element={<Protected><SettingsPage /></Protected>} />
      </Routes>
      <ToastViewport toasts={state.toasts} onDismiss={dismissToast} />
    </>
  );
}
