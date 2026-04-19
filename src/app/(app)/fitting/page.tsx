import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import FittingHistoryGrid from "@/components/FittingHistoryGrid";

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
        <FittingHistoryGrid tryOns={tryOns} />
      )}
    </div>
  );
}
