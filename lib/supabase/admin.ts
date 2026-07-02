import "server-only";

import { createClient } from "@supabase/supabase-js";

// Client com a service_role key — ignora RLS e dá acesso à API de
// administração de usuários (auth.admin). NUNCA importar isto em código
// que roda no navegador; só em server actions/route handlers.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
