import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { ConfirmEmailChange } from './pages/ConfirmEmailChange';
import { CancelEmailChange } from './pages/CancelEmailChange';
import { Weight } from './pages/Weight';
import { Meal } from './pages/Meal';
import { Exercise } from './pages/Exercise';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';

// Lazy load meal pages
const MealDetail = lazy(() => import('./pages/MealDetail'));
const MealHistory = lazy(() => import('./pages/MealHistory'));

// Lazy load training image page
const TrainingImagePage = lazy(() => import('./pages/exercise/TrainingImagePage'));

// Home component
function Home() {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900">Health Tracker</h1>
      <p className="mt-4 text-gray-600">体重・食事・運動を記録して健康管理をしましょう</p>
    </div>
  );
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout><Home /></Layout>,
  },
  {
    path: '/login',
    element: <Layout><Login /></Layout>,
  },
  {
    path: '/register',
    element: <Layout><Register /></Layout>,
  },
  {
    path: '/forgot-password',
    element: <Layout><ForgotPassword /></Layout>,
  },
  {
    path: '/reset-password',
    element: <Layout><ResetPassword /></Layout>,
  },
  {
    path: '/verify-email',
    element: <Layout><VerifyEmail /></Layout>,
  },
  {
    path: '/change-email/confirm',
    element: <Layout><ConfirmEmailChange /></Layout>,
  },
  {
    path: '/change-email/cancel',
    element: <Layout><CancelEmailChange /></Layout>,
  },
  {
    path: '/dashboard',
    element: (
      <Layout>
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/weight',
    element: (
      <Layout>
        <ProtectedRoute>
          <Weight />
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/meals',
    element: (
      <Layout>
        <ProtectedRoute>
          <Meal />
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/meals/history',
    element: (
      <Layout>
        <ProtectedRoute>
          <Suspense fallback={<div className="p-4 text-center">読み込み中...</div>}>
            <MealHistory />
          </Suspense>
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/meals/:mealId',
    element: (
      <Layout>
        <ProtectedRoute>
          <Suspense fallback={<div className="p-4 text-center">読み込み中...</div>}>
            <MealDetail />
          </Suspense>
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/exercises',
    element: (
      <Layout>
        <ProtectedRoute>
          <Exercise />
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/exercises/image',
    element: (
      <Layout>
        <ProtectedRoute>
          <Suspense fallback={<div className="p-4 text-center">読み込み中...</div>}>
            <TrainingImagePage />
          </Suspense>
        </ProtectedRoute>
      </Layout>
    ),
  },
  {
    path: '/settings',
    element: (
      <Layout>
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Layout>
    ),
  },
];

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter(routes);
