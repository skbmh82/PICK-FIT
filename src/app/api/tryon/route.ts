import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// 예측 생성 (즉시 반환 — 블로킹 없음)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tryOnId, userImageUrl, garmentImageUrl } = await request.json();

  // 카테고리 조회 → IDM-VTON category 매핑
  const { data: tryOn } = await supabase
    .from("try_ons")
    .select("garments(category)")
    .eq("id", tryOnId)
    .eq("user_id", user.id)
    .single();

  const rawCategory = (tryOn?.garments as { category?: string } | null)?.category ?? "top";
  const categoryMap: Record<string, string> = {
    top:    "upper_body",
    outer:  "upper_body",
    bottom: "lower_body",
    dress:  "dresses",
    etc:    "upper_body",
  };
  const idmCategory = categoryMap[rawCategory] ?? "upper_body";

  await supabaseAdmin.from("try_ons").update({ status: "processing" }).eq("id", tryOnId).eq("user_id", user.id);

  const maxAttempts = 4;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const prediction = await replicate.predictions.create({
        version: "0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985",
        input: {
          human_img: userImageUrl,
          garm_img: garmentImageUrl,
          garment_des: idmCategory === "lower_body" ? "pants/skirt" : idmCategory === "dresses" ? "dress" : "top/jacket",
          category: idmCategory,
          is_checked: true,
          is_checked_crop: true,
          denoise_steps: 40,
          seed: 42,
        },
      });
      return NextResponse.json({ predictionId: prediction.id });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[tryon] attempt=${attempt} category=${idmCategory} error:`, msg);
      const is429 = msg.includes("429") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("too many");
      if (is429 && attempt < maxAttempts - 1) {
        const wait = (attempt + 1) * 15000;
        console.log(`[tryon] Replicate 429 — ${wait / 1000}초 후 재시도 (${attempt + 1}/${maxAttempts - 1})`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      await supabaseAdmin.from("try_ons").update({ status: "failed" }).eq("id", tryOnId).eq("user_id", user.id);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }
  await supabaseAdmin.from("try_ons").update({ status: "failed" }).eq("id", tryOnId).eq("user_id", user.id);
  return NextResponse.json({ error: "최대 재시도 횟수 초과" }, { status: 500 });
}
