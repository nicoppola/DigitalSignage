import { useState, FormEvent } from 'react';
import { authAPI } from '../../services/api';
import { useFormInput } from '../../hooks/useFormInput.ts';
import { logger } from '../../utils/logger.ts';
import { HTTP_STATUS } from '../../constants.ts';
import './Login.css';

interface LoginProps {
  onLoginSuccess: () => void;
}

interface ErrorWithResponse {
  response?: {
    status?: number;
  };
}

const Login = ({ onLoginSuccess }: LoginProps) => {
  const username = useFormInput('');
  const password = useFormInput('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authAPI.login(username.value, password.value);
      onLoginSuccess();
    } catch (err) {
      logger.error('Login failed', err);
      const errorWithResponse = err as ErrorWithResponse;
      setError(errorWithResponse.response?.status === HTTP_STATUS.UNAUTHORIZED ? 'Invalid credentials' : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form className="login-form" onSubmit={handleSubmit} aria-label="Login form">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          {...username}
          aria-required="true"
          aria-invalid={error ? 'true' : 'false'}
          autoComplete="username"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          {...password}
          aria-required="true"
          aria-invalid={error ? 'true' : 'false'}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={loading}
          aria-label={loading ? 'Logging in...' : 'Login'}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        {error && (
          <div className="login-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}
      </form>
    </div>
  );
};

export default Login;
