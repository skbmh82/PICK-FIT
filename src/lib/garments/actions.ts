"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function deleteGarment(garmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("garments")
    .delete()
    .eq("id", garmentId)
    .eq("user_id", user.id);

  if (error) return { error: "삭제에 실패했습니다." };

  revalidatePath("/wardrobe");
}

// destination: "fit" → 피팅 바로 시작 | "wardrobe" → 옷장에 저장
export async function addGarmentByUrl(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const imageUrl = formData.get("imageUrl") as string;
  const sourceUrl = formData.get("sourceUrl") as string;
  const shopName = formData.get("shopName") as string;
  const category = (formData.get("category") as string) || "etc";
  const destination = (formData.get("destination") as string) || "fit";

  const { data, error } = await supabase
    .from("garments")
    .insert({ user_id: user.id, image_url: imageUrl, source_url: sourceUrl, shop_name: shopName, category })
    .select("id")
    .single();

  if (error) return { error: "아이템 저장에 실패했습니다." };

  redirect(destination === "wardrobe" ? "/wardrobe" : `/fitting/new?garmentId=${data.id}`);
}

export async function addGarmentByUpload(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const file = formData.get("file") as File;
  const category = (formData.get("category") as string) || "etc";
  const destination = (formData.get("destination") as string) || "fit";

  if (!file || file.size === 0) return { error: "파일을 선택해주세요." };
  if (file.size > 10 * 1024 * 1024) return { error: "파일 크기는 10MB 이하만 가능합니다." };

  const ext = file.name.split(".").pop();
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("garments")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) return { error: "이미지 업로드에 실패했습니다." };

  const { data: { publicUrl } } = supabase.storage.from("garments").getPublicUrl(path);

  const { data, error } = await supabase
    .from("garments")
    .insert({ user_id: user.id, image_url: publicUrl, category })
    .select("id")
    .single();

  if (error) return { error: "아이템 저장에 실패했습니다." };

  redirect(destination === "wardrobe" ? "/wardrobe" : `/fitting/new?garmentId=${data.id}`);
}
