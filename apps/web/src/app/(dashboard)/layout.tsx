import { SidebarNav } from "@/components/layout/sidebar-nav";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen terminal-grid bg-background">
      {/* Sidebar Panel */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card/65 backdrop-blur-md md:block">
        <div className="flex h-16 items-center border-b border-border px-6">
          <div className="flex items-center gap-2">
            <span className="font-orbitron text-lg font-black tracking-widest text-primary text-glow-cyan uppercase">
              Auditor-AI
            </span>
            <span className="h-4 w-2 bg-primary animate-pulse inline-block" />
          </div>
        </div>
        <div className="py-4">
          <SidebarNav />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/40 backdrop-blur-md px-6">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="text-primary font-bold">&gt;</span>
            <span>SYSTEM_STATUS: <span className="text-emerald-400 font-bold">ONLINE</span></span>
          </div>
          <div className="flex items-center gap-4">
            {/* User status or breadcrumbs */}
            <div className="rounded-sm border border-border bg-muted/50 px-2.5 py-1 font-mono text-[10px] font-semibold text-muted-foreground uppercase">
              v0.2.0-beta
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
