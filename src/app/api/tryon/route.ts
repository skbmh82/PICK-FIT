import { createClient } from "@/lib/supabase/server";
import { tryOnProvider } from "@/lib/virtual-tryon";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tryOnId, userImageUrl, garmentImageUrl } = await request.json();

  // processing 상태로 업데이트
  await supabase.from("try_ons").update({ status: "processing" }).eq("id", tryOnId).eq("user_id", user.id);

  try {
    const result = await tryOnProvider.run({ userImageUrl, garmentImageUrl });

    await supabase
      .from("try_ons")
      .update({ status: "done", result_url: result.resultUrl })
      .eq("id", tryOnId)
      .eq("user_id", user.id);

    return NextResponse.json({ resultUrl: result.resultUrl });
  } catch (e) {
    await supabase.from("try_ons").update({ status: "failed" }).eq("id", tryOnId).eq("user_id", user.id);
    const msg = e instanceof Error ? e.message : String(e);
    console.error("TryOn failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
