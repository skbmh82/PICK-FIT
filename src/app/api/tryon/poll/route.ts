import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// 예측 상태 폴링
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const predictionId = searchParams.get("id");
  const tryOnId = searchParams.get("tryOnId");

  if (!predictionId || !tryOnId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prediction = await replicate.predictions.get(predictionId);

  if (prediction.status === "succeeded") {
    const output = prediction.output;
    const resultUrl = Array.isArray(output) ? String(output[0]) : String(output);

    const { error: updateError } = await supabaseAdmin
      .from("try_ons")
      .update({ status: "done", result_url: resultUrl })
      .eq("id", tryOnId)
      .eq("user_id", user.id);

    if (updateError) console.error("[poll] DB update failed:", updateError.message);

    return NextResponse.json({ status: "done", resultUrl });
  }

  if (prediction.status === "failed" || prediction.status === "canceled") {
    await supabaseAdmin.from("try_ons").update({ status: "failed" }).eq("id", tryOnId).eq("user_id", user.id);
    return NextResponse.json({ status: "failed", error: prediction.error ?? "예측 실패" });
  }

  // starting | processing
  return NextResponse.json({ status: "processing" });
}
