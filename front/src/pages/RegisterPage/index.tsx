// front/src/pages/RegisterPage/index.tsx

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { AxiosError } from 'axios'; // Импортируем тип ошибки Axios

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(email, password, displayName);
      navigate('/');
    } catch (err: unknown) {
      let message = 'Ошибка регистрации';

      // Проверяем, является ли ошибка экземпляром AxiosError
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data;

        // NestJS часто возвращает сообщение в поле message (строка или массив)
        if (typeof data.message === 'string') {
          message = data.message;
        } else if (Array.isArray(data.message)) {
          message = data.message.join(', ');
        } else if (typeof data.error === 'string') {
          // Иногда ошибка лежит в поле error
          message = data.error;
        }
      } else if (err instanceof Error) {
        // Если это обычная JS ошибка
        message = err.message;
      }

      setError(message);
      console.error('Registration failed:', err);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '1rem'
    }}>
      <h2>Регистрация</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
        <input
          type="text"
          placeholder="Имя"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          minLength={2}
          style={{ padding: '8px' }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '8px' }}
        />
        <input
          type="password"
          placeholder="Пароль (мин. 8 символов)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          style={{ padding: '8px' }}
        />
        <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>Зарегистрироваться</button>
      </form>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      <Link to="/login">Уже есть аккаунт? Войти</Link>
    </div>
  );
}