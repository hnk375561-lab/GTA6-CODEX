'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';

export default function IngresarPage() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  // Ya hay sesión: no tiene sentido mostrar el formulario de login de
  // nuevo (y evita que alguien logueado mande otro magic link sin darse
  // cuenta). El logout vive en el ícono del Header, no acá.
  if (!loading && user) {
    return (
      <div style={{ padding: 32, maxWidth: 400, margin: '0 auto' }}>
        <h1>Ingresar</h1>
        <p>Ya iniciaste sesión como {user.email}.</p>
        <p>
          <Link href="/">Volver al inicio</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 400, margin: '0 auto' }}>
      <h1>Ingresar</h1>
      {sent ? (
        <p>Te mandamos un link a {email}. Abrilo para entrar.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            required
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', width: '100%', padding: 8, marginBottom: 12 }}
          />
          <button type="submit">Enviar link de acceso</button>
          {error && <p style={{ color: '#c0392b' }}>{error}</p>}
        </form>
      )}
    </div>
  );
}
