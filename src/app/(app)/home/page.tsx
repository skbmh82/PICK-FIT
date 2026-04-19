import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tryOns } = await supabase
    .from("try_ons")
    .select("id, result_url, status, created_at, garments(image_url, shop_name)")
    .eq("user_id", user!.id)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    <div className="px-4 pt-6 pb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          PICK<span className="text-violet-600">FIT</span>
        </h1>
        <Link href="/profile">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-sm font-bold">
            {user?.email?.[0].toUpperCase()}
          </div>
        </Link>
      </div>

      {/* 피팅 시작 배너 */}
      <Link href="/add">
        <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 p-6 mb-6 shadow-lg shadow-violet-200 relative overflow-hidden">
          {/* 배경 장식 */}
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-fuchsia-400/20" />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mb-2">
                AI 피팅룸, 픽핏 (PICK FIT)
              </p>
              <p className="text-white text-2xl font-extrabold leading-tight tracking-tight">
                픽!<br />
                <span className="text-fuchsia-200">한 번에 핏!</span>
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                <span className="text-white text-xs font-semibold">지금 피팅 시작하기</span>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-4xl shadow-inner">
                👗
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                ✨
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* 최근 피팅 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">최근 피팅</h2>
        <Link href="/wardrobe" className="text-xs text-violet-600 font-medium">
          전체 보기
        </Link>
      </div>

      {!tryOns || tryOns.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <p className="text-3xl mb-2">👗</p>
          <p className="text-sm text-gray-400 font-medium">아직 피팅 기록이 없어요</p>
          <p className="text-xs text-gray-300 mt-1">아이템을 추가하고 입어봐요!</p>
          <Link
            href="/add"
            className="mt-4 inline-block px-5 py-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium"
          >
            첫 피팅 시작하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {tryOns.map((item) => (
            <div key={item.id} className="rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm aspect-[3/4] relative">
              {item.result_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.result_url} alt="피팅 결과" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                    <p className="text-xs text-gray-400">처리 중</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
