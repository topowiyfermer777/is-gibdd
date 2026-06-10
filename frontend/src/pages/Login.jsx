import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogoIcon, WarningIcon, RegisterIcon, LockIcon, CloseIcon } from '../components/Icons';

const Login = () => {
  const { login, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to home
  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (!username.trim()) {
      setError('Введите табельный номер сотрудника.');
      return;
    }
    if (isNaN(username)) {
      setError('Табельный номер должен состоять только из цифр.');
      return;
    }
    if (!password) {
      setError('Введите пароль.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await login(username, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Произошла непредвиденная ошибка при авторизации.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Top Header Card Accent */}
        <div className="h-2 bg-blue-600 w-full"></div>
        
        <div className="p-8">
          {/* Logo & App branding */}
          <div className="text-center mb-8">
            <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-blue-100/50 mb-3 animate-bounce">
              <LogoIcon className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">ИС ГИБДД</h2>
            <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase mt-0.5">Вход для сотрудников</p>
          </div>

          {/* Error alert banner */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800 text-sm">
              <WarningIcon className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="badge" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Табельный номер
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="badge"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Например, 1002"
                  className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                  disabled={submitting}
                />
                {username ? (
                  <button
                    type="button"
                    onClick={() => setUsername('')}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-650 transition-colors"
                    title="Очистить"
                    disabled={submitting}
                  >
                    <CloseIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <span className="absolute right-4 top-3.5 select-none">
                    <RegisterIcon className="h-5 w-5 text-slate-400" />
                  </span>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Пароль
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium text-slate-800"
                  disabled={submitting}
                />
                {password ? (
                  <button
                    type="button"
                    onClick={() => setPassword('')}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-650 transition-colors"
                    title="Очистить"
                    disabled={submitting}
                  >
                    <CloseIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <span className="absolute right-4 top-3.5 select-none">
                    <LockIcon className="h-5 w-5 text-slate-400" />
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-md shadow-blue-100 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Выполняется вход...</span>
                </>
              ) : (
                <span>Войти в систему</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer help line */}
        <div className="bg-slate-50 border-t border-slate-100 px-8 py-4 text-center text-xs text-slate-400 font-medium">
          Проблемы со входом? Свяжитесь с <span className="text-slate-500 font-semibold cursor-pointer underline hover:text-slate-700">системным администратором</span>.
        </div>
      </div>
    </div>
  );
};

export default Login;
