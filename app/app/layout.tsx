import AppBottomNav from "@/components/AppBottomNav";

export default function AppSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-frame-v35">
      {children}
      <AppBottomNav />
    </div>
  );
}
