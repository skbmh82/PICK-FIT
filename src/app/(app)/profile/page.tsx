import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/auth/actions";

const PLAN_INFO = {
  free:  { label: "무료 플랜", limit: "월 3회", color: "text-gray-600 bg-gray-100" },
  basic: { label: "Basic",    limit: "월 20회", color: "text-violet-700 bg-violet-100" },
  pro:   { label: "Pro",      limit: "무제한",  color: "text-fuchsia-700 bg-fuchsia-100" },
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("plan, tryon_count, created_at")
    .eq("id", user!.id)
    .single();

  const { count: garmentCount } = await supabase
    .from("garments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const plan = (profile?.plan ?? "free") as keyof typeof PLAN_INFO;
  const planInfo = PLAN_INFO[plan];

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-gray-900 mb-6">프로필</h1>

      {/* 유저 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {user?.email?.[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
          <span className={`mt-1 inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${planInfo.color}`}>
            {planInfo.label}
          </span>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-violet-600">{garmentCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">등록 아이템</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-fuchsia-600">{profile?.tryon_count ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">총 피팅 횟수</p>
        </div>
      </div>

      {/* 플랜 업그레이드 */}
      {plan === "free" && (
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-5 mb-4">
          <p className="text-white font-bold mb-1">Pro로 업그레이드</p>
          <p className="text-white/80 text-xs mb-3">무제한 피팅 + 결과 이미지 영구 보관</p>
          <div className="flex gap-2">
            <button className="flex-1 bg-white text-violet-700 text-sm font-semibold py-2 rounded-xl">
              Basic · ₩4,900/월
            </button>
            <button className="flex-1 bg-white/20 text-white text-sm font-semibold py-2 rounded-xl border border-white/40">
              Pro · ₩9,900/월
            </button>
          </div>
        </div>
      )}

      {/* 메뉴 */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 mb-4">
        {[
          { label: "이용 내역", icon: "📋" },
          { label: "알림 설정", icon: "🔔" },
          { label: "개인정보처리방침", icon: "🔒" },
          { label: "이용약관", icon: "📄" },
          { label: "앱 버전", icon: "ℹ️", value: "v0.1.0" },
        ].map(({ label, icon, value }) => (
          <div key={label} className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <span className="text-base">{icon}</span>
              <span className="text-sm text-gray-700">{label}</span>
            </div>
            {value ? (
              <span className="text-xs text-gray-400">{value}</span>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
          </div>
        ))}
      </div>

      {/* 로그아웃 */}
      <form action={logout}>
        <button
          type="submit"
          className="w-full py-3 rounded-2xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition"
        >
          로그아웃
        </button>
      </form>
    </div>
  );
}
