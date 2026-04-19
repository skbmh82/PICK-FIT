"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteGarment } from "@/lib/garments/actions";

type Garment = {
  id: string;
  image_url: string;
  category: string | null;
  shop_name: string | null;
};

export default function WardrobeGrid({ garments }: { garments: Garment[] }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("이 아이템을 삭제할까요?")) return;
    setDeletingId(id);
    await deleteGarment(id);
    setDeletingId(null);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {garments.map((item) => (
        <div key={item.id} className="relative group">
          <Link href={`/fitting/new?garmentId=${item.id}`}>
            <div className="rounded-xl overflow-hidden bg-gray-100 aspect-[3/4] relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image_url}
                alt={item.category ?? ""}
                className={`w-full h-full object-cover transition duration-200 ${deletingId === item.id ? "opacity-40" : "group-hover:scale-105"}`}
              />
              {item.shop_name && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5">
                  <p className="text-white text-xs font-medium truncate">{item.shop_name}</p>
                </div>
              )}
            </div>
          </Link>

          {/* 삭제 버튼 */}
          <button
            onClick={(e) => handleDelete(e, item.id)}
            disabled={deletingId === item.id}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
