/**
 * ForgotPasswordLink Component
 *
 * Displays a link to the password reset request page
 * Typically shown on the login page
 */

import { Link } from 'react-router-dom';

export function ForgotPasswordLink() {
  return (
    <div className="text-center mt-4">
      <Link
        to="/forgot-password"
        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
      >
        パスワードをお忘れですか？
      </Link>
    </div>
  );
}
