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
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-5 mb-6 flex items-center justify-between shadow-md">
          <div>
            <p className="text-white/80 text-xs font-medium mb-1">AI 가상 피팅</p>
            <p className="text-white text-lg font-bold leading-tight">
              입기 전에<br />먼저 입어봐!
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
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
