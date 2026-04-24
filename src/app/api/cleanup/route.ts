import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// Vercel Cron: 매일 새벽 3시 실행 (vercel.json 참고)
// Pro 플랜 유저는 보존, 무료/Basic 유저는 30일 후 삭제
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  // 30일 지난 done 레코드 중 Pro가 아닌 유저 조회
  const { data: oldTryOns, error } = await supabaseAdmin
    .from("try_ons")
    .select("id, result_url, user_id, users(plan)")
    .eq("status", "done")
    .lt("created_at", cutoff.toISOString())
    .not("result_url", "is", null);

  if (error) {
    console.error("[cleanup] Query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let deleted = 0;
  for (const item of oldTryOns ?? []) {
    const plan = (item.users as { plan?: string } | null)?.plan ?? "free";
    if (plan === "pro") continue; // Pro 유저는 보존

    // Supabase Storage에서 이미지 삭제
    if (item.result_url?.includes("/storage/")) {
      const path = item.result_url.split("/garments/")[1];
      if (path) {
        await supabaseAdmin.storage.from("garments").remove([path]);
      }
    }

    // DB result_url 초기화 (레코드는 남김)
    await supabaseAdmin
      .from("try_ons")
      .update({ result_url: null, status: "expired" })
      .eq("id", item.id);

    deleted++;
  }

  console.log(`[cleanup] ${deleted}개 이미지 삭제 완료`);
  return NextResponse.json({ deleted, scanned: oldTryOns?.length ?? 0 });
}
