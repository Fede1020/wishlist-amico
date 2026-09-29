'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Registra l'utente in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
      }

    // 2. Crea il profilo nella tabella 'profiles'
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: username,
          gaming_tastes: '',
        });

      if (profileError) {
        setError('Errore nella creazione del profilo: ' + profileError.message);
        setLoading(false);
        return;
      }
    }

    setSuccess(true);
    setLoading(false);
    
    // Reindirizza al login dopo 2 secondi
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
          <h2 className="mb-4 text-2xl font-bold text-green-600">Registrazione completata! 🎉</h2>
          <p className="text-gray-600">Reindirizzamento al login in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="mb-6 text-center text-3xl font-bold text-indigo-600">
          🎮 Registrati
        </h1>
        
        {error && (
          <div className="mb-4 rounded bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="IlTuoNickname"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="tua@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Minimo 6 caratteri"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Registrazione in corso...' : 'Registrati'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Hai già un account?{' '}
          <a href="/login" className="font-semibold text-indigo-600 hover:underline">
            Accedi
          </a>
        </p>
      </div>
    </div>
  );
}