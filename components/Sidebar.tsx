"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Settings, 
  LogOut, 
  Cpu, 
  Globe, 
  Trophy, 
  Briefcase, 
  Calendar, 
  Bell, 
  Coins, 
  LineChart, 
  Play, 
  Search,
  Sparkles,
  X
} from "lucide-react";

interface UserProfile {
  name: string;
  email: string;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentTab = searchParams.get("tab") || "india";
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not logged in");
      })
      .then((data) => setUser(data))
      .catch(() => {
        router.push("/auth/login");
      });
  }, [router]);

  const handleLogout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (res.ok) {
      router.push("/auth/login");
      router.refresh();
    }
  };

  const menuSections = [
    {
      title: "Global Markets",
      icon: Globe,
      items: [
        { name: "India (NSE/BSE)", tab: "india", icon: LineChart },
        { name: "United States (US)", tab: "us", icon: LineChart },
        { name: "Cryptocurrency", tab: "crypto", icon: Coins },
        { name: "Global Indices", tab: "indices", icon: LineChart }
      ]
    },
    {
      title: "Analytics Suites",
      items: [
        { name: "Top Signals Today", tab: "top", icon: Sparkles },
        { name: "Sports Intelligence", tab: "sports", icon: Trophy },
        { name: "Portfolio Studio", tab: "portfolio", icon: Briefcase },
        { name: "AI Research (RAG)", tab: "research", icon: Search },
        { name: "Economic Calendar", tab: "calendar", icon: Calendar },
        { name: "Strategy Lab", tab: "backtest", icon: Play }
      ]
    },
    {
      title: "Controls",
      items: [
        { name: "Alerts Control", tab: "alerts", icon: Bell },
        { name: "Settings", tab: "settings", icon: Settings }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        w-64 h-screen glass border-r border-border flex flex-col justify-between p-4 overflow-y-auto
        fixed md:sticky top-0 left-0 z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
      `}>
        <div className="flex flex-col gap-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="p-2 rounded-lg bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="font-bold text-base tracking-wider bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                  SIGNAL AI
                </h1>
                <p className="text-[10px] text-slate-400 font-medium tracking-tight">Enterprise Global Markets</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg md:hidden hover:bg-white/5 border border-transparent"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sections */}
          <nav className="flex flex-col gap-4">
            {menuSections.map((section, sIdx) => (
              <div key={sIdx} className="flex flex-col gap-1">
                <span className="px-2 text-[10px] uppercase font-extrabold text-slate-500 tracking-wider mb-1.5 flex items-center gap-1.5">
                  {section.icon && <section.icon className="w-3.5 h-3.5" />}
                  {section.title}
                </span>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.tab;
                  return (
                    <Link
                      key={item.tab}
                      href={`/dashboard?tab=${item.tab}`}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-indigo-500/20 text-white border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                          : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

      {/* User Footer Profile */}
      <div className="flex flex-col gap-3 pt-4 border-t border-border/40 mt-6">
        {user ? (
          <div className="flex items-center justify-between gap-2 px-2">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">{user.name}</span>
              <span className="text-[10px] text-slate-400 truncate font-mono">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200 border border-transparent hover:border-red-500/20"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="h-8 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
export default Sidebar;
