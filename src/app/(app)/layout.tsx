import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 max-w-lg mx-auto w-full pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
