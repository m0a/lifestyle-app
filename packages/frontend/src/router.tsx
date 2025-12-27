import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Weight } from './pages/Weight';
import { Meal } from './pages/Meal';

// Placeholder components for protected pages
function Home() {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900">Health Tracker</h1>
      <p className="mt-4 text-gray-600">体重・食事・運動を記録して健康管理をしましょう</p>
    </div>
  );
}

function Dashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
      <p className="mt-2 text-gray-600">実装予定</p>
    </div>
  );
}

function Exercises() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">運動記録</h1>
      <p className="mt-2 text-gray-600">実装予定</p>
    </div>
  );
}

export const router = createBrowserRouter([
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
    path: '/exercises',
    element: (
      <Layout>
        <ProtectedRoute>
          <Exercises />
        </ProtectedRoute>
      </Layout>
    ),
  },
]);
