"use server";

import { createClient } from "@/lib/supabase/server";
import { tryOnProvider } from "@/lib/virtual-tryon";
import { redirect } from "next/navigation";

export async function startTryOn(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const garmentId = formData.get("garmentId") as string;
  const file = formData.get("file") as File;

  if (!file || file.size === 0) return { error: "사진을 업로드해주세요." };
  if (file.size > 10 * 1024 * 1024) return { error: "파일 크기는 10MB 이하만 가능합니다." };

  // 사용자 사진 Storage 업로드
  const ext = file.name.split(".").pop();
  const userPhotoPath = `${user.id}/person/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("garments")
    .upload(userPhotoPath, file, { contentType: file.type });
  if (uploadError) return { error: "사진 업로드에 실패했습니다." };

  const { data: { publicUrl: userImageUrl } } = supabase.storage
    .from("garments")
    .getPublicUrl(userPhotoPath);

  // 옷 이미지 URL 조회
  const { data: garment } = await supabase
    .from("garments")
    .select("image_url")
    .eq("id", garmentId)
    .eq("user_id", user.id)
    .single();
  if (!garment) return { error: "아이템을 찾을 수 없습니다." };

  // try_on 레코드 생성 (pending)
  const { data: tryOn, error: dbError } = await supabase
    .from("try_ons")
    .insert({ user_id: user.id, garment_id: garmentId, status: "pending" })
    .select("id")
    .single();
  if (dbError) return { error: "피팅 시작에 실패했습니다." };

  // 결과 페이지로 먼저 이동 (백그라운드에서 AI 실행)
  // 실제 API 호출은 결과 페이지의 API route에서 처리
  redirect(`/fitting/${tryOn.id}?garmentId=${garmentId}&userImg=${encodeURIComponent(userImageUrl)}&garmImg=${encodeURIComponent(garment.image_url)}`);
}
