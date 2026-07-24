"use client";

import React, { Suspense, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Menu, Cpu } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#030712] text-slate-100">
      <Suspense fallback={null}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </Suspense>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header Bar */}
        <header className="flex items-center justify-between px-4 py-3 bg-[#030712]/80 backdrop-blur-md border-b border-border/40 sticky top-0 z-30 md:hidden w-full">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm tracking-wider bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent font-sans">
              SIGNAL AI
            </span>
          </div>
          <div className="p-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Cpu className="w-4 h-4 animate-pulse" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <Suspense fallback={<div className="flex flex-col gap-6 w-full animate-pulse"><div className="h-10 bg-slate-800 rounded w-1/4"></div></div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
