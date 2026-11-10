import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastContainer } from './components/ui/ToastContainer';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { SuperAdminPage } from './pages/admin/SuperAdminPage';
import { AIPage } from './pages/ai/AIPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { OverviewPage } from './pages/dashboard/OverviewPage';
import { GymsPage } from './pages/gyms/GymsPage';
import { MembersPage } from './pages/members/MembersPage';
import { MembershipsPage } from './pages/memberships/MembershipsPage';
import { MessagesPage } from './pages/messages/MessagesPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { NutritionPage } from './pages/nutrition/NutritionPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { TrainersPage } from './pages/trainers/TrainersPage';
import { WorkoutsPage } from './pages/workouts/WorkoutsPage';
import { useAuthStore } from './store/authStore';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 30_000,
        },
    },
});
const ProtectedRoute = ({ children }) => {
    const accessToken = useAuthStore((s) => s.accessToken);
    if (!accessToken) {
        return <Navigate to="/login" replace/>;
    }
    return <>{children}</>;
};
const PublicOnlyRoute = ({ children }) => {
    const accessToken = useAuthStore((s) => s.accessToken);
    if (accessToken) {
        return <Navigate to="/dashboard" replace/>;
    }
    return <>{children}</>;
};
export function App() {
    return (<QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace/>}/>
          <Route path="/login" element={<PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>}/>
          <Route path="/register" element={<PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>}/>
          <Route path="/forgot-password" element={<ForgotPasswordPage />}/>
          <Route path="/reset-password" element={<ResetPasswordPage />}/>
          <Route path="/dashboard" element={<ProtectedRoute>
                <OverviewPage />
              </ProtectedRoute>}/>
          <Route path="/gyms" element={<ProtectedRoute>
                <GymsPage />
              </ProtectedRoute>}/>
          <Route path="/members" element={<ProtectedRoute>
                <MembersPage />
              </ProtectedRoute>}/>
          <Route path="/trainers" element={<ProtectedRoute>
                <TrainersPage />
              </ProtectedRoute>}/>
          <Route path="/memberships" element={<ProtectedRoute>
                <MembershipsPage />
              </ProtectedRoute>}/>
          <Route path="/payments" element={<ProtectedRoute>
                <PaymentsPage />
              </ProtectedRoute>}/>
          <Route path="/workouts" element={<ProtectedRoute>
                <WorkoutsPage />
              </ProtectedRoute>}/>
          <Route path="/nutrition" element={<ProtectedRoute>
                <NutritionPage />
              </ProtectedRoute>}/>
          <Route path="/ai-studio" element={<ProtectedRoute>
                <AIPage />
              </ProtectedRoute>}/>
          <Route path="/analytics" element={<ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>}/>
          <Route path="/attendance" element={<ProtectedRoute>
                <AttendancePage />
              </ProtectedRoute>}/>
          <Route path="/notifications" element={<ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>}/>
          <Route path="/messages" element={<ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>}/>
          <Route path="/profile" element={<ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>}/>
          <Route path="/admin" element={<ProtectedRoute>
                <SuperAdminPage />
              </ProtectedRoute>}/>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>);
}
export default App;
