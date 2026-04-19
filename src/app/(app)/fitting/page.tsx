import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function FittingHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: tryOns } = await supabase
    .from("try_ons")
    .select("id, result_url, status, created_at, garments(image_url, shop_name, category)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-gray-900 mb-5">피팅 기록</h1>

      {!tryOns || tryOns.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center mt-6">
          <p className="text-3xl mb-2">✨</p>
          <p className="text-sm text-gray-400 font-medium">아직 피팅 기록이 없어요</p>
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
            <div key={item.id} className="rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm">
              <div className="aspect-[3/4] relative bg-gray-100">
                {item.result_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.result_url} alt="피팅 결과" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                    {item.status === "failed" || item.status === "pending" || item.status === "processing" ? (
                      <>
                        <p className="text-xl">😢</p>
                        <p className="text-xs text-red-400">피팅 실패</p>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="px-2.5 py-2">
                <p className="text-xs text-gray-500 truncate">
                  {Array.isArray(item.garments) ? item.garments[0]?.shop_name : (item.garments as { shop_name?: string } | null)?.shop_name ?? "직접 업로드"}
                </p>
                <p className="text-xs text-gray-300">
                  {new Date(item.created_at).toLocaleDateString("ko-KR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
