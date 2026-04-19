import { createClient } from "@supabase/supabase-js";

// RLS를 우회하는 서버 전용 admin 클라이언트 (API Route에서만 사용)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
