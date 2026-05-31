import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav, MobileHeader } from "@/components/layout/mobile-nav";
import { ToastProvider } from "@/components/ui/toast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex h-screen bg-[#07080f] overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        {/* Main content */}
        <main className="flex-1 md:ml-64 overflow-y-auto pb-20 md:pb-0">
          {/* Mobile top header */}
          <MobileHeader />
          {children}
        </main>
        {/* Mobile bottom nav */}
        <MobileNav />
      </div>
    </ToastProvider>
  );
}
