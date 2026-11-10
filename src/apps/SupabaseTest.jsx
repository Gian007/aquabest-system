import { useEffect, useState } from 'react';
import { testSupabaseConnection } from '../services/supabaseClient.js';

// Temporary page: open  http://localhost:5173/aquabest-system/?view=dbtest
// delete mo to file gi after pag gumagana na supabase connection. 
export default function SupabaseTest() {
  const [result, setResult] = useState(null);
  useEffect(() => { testSupabaseConnection().then(setResult); }, []);
  return (
    <main style={{ maxWidth: 520, margin: '48px auto', padding: 16, fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ fontSize: 22 }}>Supabase connection test</h1>
      {!result && <p>Checking…</p>}
      {result && (
        <>
          <p style={{ color: result.ok ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
            {result.message}
          </p>
          {result.ok && (
            <ul>
              <li>Email login: {result.emailLoginEnabled ? 'enabled' : 'disabled'}</li>
              <li>Phone (SMS OTP) login: {result.phoneLoginEnabled ? 'enabled' : 'not enabled yet'}</li>
            </ul>
          )}
        </>
      )}
    </main>
  );
}