"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Map, Store, Bike, LogOut, Menu, X, User, TrendingUp, Zap } from "lucide-react";
import { useAuthStore } from "@/lib/store";

const NAV = [
  { name: "Live Map",        href: "/",               icon: Map },
  { name: "Restaurants",     href: "/restaurants",    icon: Store },
  { name: "Delivery Agents", href: "/delivery-agents",icon: Bike },
  { name: "Analytics",       href: "/analytics",      icon: TrendingUp },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { token, user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); if (!token) router.push("/login"); }, [token, router]);
  if (!mounted || !token) return null;

  const currentTitle = NAV.find(n => n.href === "/" ? pathname === "/" : pathname.startsWith(n.href))?.name ?? "Dashboard";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#09090b" }}>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-52 flex-col",
          "transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{ background: "#0a0a0c", borderRight: "1px solid #1a1a1f" }}
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 px-4" style={{ borderBottom: "1px solid #1a1a1f" }}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "#818cf8" }}>
            <Zap className="h-3.5 w-3.5 text-white" fill="white" />
          </div>
          <span className="text-[14px] font-semibold" style={{ color: "#e4e4e7" }}>RideShare</span>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden" style={{ color: "#52525b" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          <p className="px-2 mb-2 text-[9px] uppercase tracking-widest" style={{ color: "#3f3f46" }}>Menu</p>
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors"
                style={{
                  color: active ? "#e4e4e7" : "#52525b",
                  background: active ? "#1a1a1f" : "transparent",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#a1a1aa"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#52525b"; }}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate">{item.name}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#818cf8" }} />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-2 py-3" style={{ borderTop: "1px solid #1a1a1f" }}>
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 mb-1" style={{ background: "#111113" }}>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "#1a1a1f", border: "1px solid #27272a" }}>
              <User className="h-3 w-3" style={{ color: "#71717a" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate" style={{ color: "#a1a1aa" }}>{user?.username ?? "User"}</p>
              <p className="text-[10px] capitalize" style={{ color: "#3f3f46" }}>{user?.role ?? "guest"}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] transition-colors"
            style={{ color: "#52525b" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#a1a1aa"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#52525b"; }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col h-full min-w-0">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 px-5" style={{ borderBottom: "1px solid #1a1a1f", background: "#09090b" }}>
          <button className="lg:hidden" style={{ color: "#52525b" }} onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-[14px] font-medium" style={{ color: "#a1a1aa" }}>{currentTitle}</p>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#22c55e" }} />
            <span className="text-[11px]" style={{ color: "#3f3f46" }}>Live</span>
          </div>
          <div className="h-4 w-px" style={{ background: "#1a1a1f" }} />
          <p className="text-[12px]" style={{ color: "#52525b" }}>{user?.username ?? "User"}</p>
        </header>

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
