'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function IngresarPage() {
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
