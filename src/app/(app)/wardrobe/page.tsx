import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import WardrobeGrid from "@/components/WardrobeGrid";

const CATEGORY_LABELS: Record<string, string> = {
  all: "전체",
  top: "상의",
  bottom: "하의",
  dress: "원피스",
  outer: "아우터",
  etc: "기타",
};

export default async function WardrobePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; shop?: string }>;
}) {
  const { category = "all", shop } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from("garments")
    .select("id, image_url, category, shop_name, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  if (category !== "all") query = query.eq("category", category);
  if (shop) query = query.eq("shop_name", shop);

  const { data: garments } = await query;

  // 보유한 쇼핑몰 목록
  const { data: allGarments } = await supabase
    .from("garments")
    .select("shop_name")
    .eq("user_id", user!.id)
    .not("shop_name", "is", null);

  const shops = [...new Set((allGarments ?? []).map((g) => g.shop_name).filter(Boolean))];

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold text-gray-900 mb-5">내 옷장</h1>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={`/wardrobe?category=${key}${shop ? `&shop=${shop}` : ""}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition ${
              category === key
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-violet-300"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* 쇼핑몰 필터 */}
      {shops.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          <Link
            href={`/wardrobe?category=${category}`}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition ${
              !shop ? "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" : "bg-white text-gray-500 border-gray-200"
            }`}
          >
            전체 쇼핑몰
          </Link>
          {shops.map((s) => (
            <Link
              key={s}
              href={`/wardrobe?category=${category}&shop=${s}`}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition ${
                shop === s ? "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" : "bg-white text-gray-500 border-gray-200"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      )}

      {/* 아이템 수 */}
      <p className="text-xs text-gray-400 mb-3">{garments?.length ?? 0}개의 아이템</p>

      {/* 갤러리 */}
      {!garments || garments.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center mt-6">
          <p className="text-3xl mb-2">👚</p>
          <p className="text-sm text-gray-400 font-medium">아직 등록된 아이템이 없어요</p>
          <Link
            href="/add"
            className="mt-4 inline-block px-5 py-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-medium"
          >
            아이템 추가하기
          </Link>
        </div>
      ) : (
        <WardrobeGrid garments={garments} />
      )}

      {/* FAB */}
      <Link
        href="/add"
        className="fixed bottom-20 right-4 w-12 h-12 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full flex items-center justify-center shadow-lg"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </Link>
    </div>
  );
}
