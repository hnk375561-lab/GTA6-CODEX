'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type VehicleCategory = {
  id: string;
  name: string;
  enabled: boolean;
};

export default function TestSupabasePage() {
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('vehicle_categories')
      .select('*')
      .order('id')
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setCategories(data ?? []);
        }
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto' }}>
      <h1>Prueba de conexión a Supabase — Fase 1</h1>

      {loading && <p>Cargando…</p>}

      {error && (
        <p style={{ color: '#c0392b' }}>
          <strong>Error:</strong> {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <p style={{ color: '#27ae60' }}>
            ✅ Conexión OK. Se leyeron {categories.length} categorías desde Supabase.
          </p>
          <ul>
            {categories.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong> ({c.id}) —{' '}
                {c.enabled ? 'activa' : 'inactiva'}
              </li>
            ))}
          </ul>
        </>
      )}

      <p style={{ marginTop: 32, fontSize: 12, color: '#888' }}>
        Esta página es temporal, solo para verificar la Fase 1 (sección 19 del
        documento maestro). Se puede borrar una vez confirmado que funciona.
      </p>
    </div>
  );
}
