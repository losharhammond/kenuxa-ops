import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

interface AppLayoutProps {
  children:     React.ReactNode;
  title:        string;
  description?: string;
  actions?:     React.ReactNode;
}

export function AppLayout({ children, title, description, actions }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} description={description} actions={actions} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
