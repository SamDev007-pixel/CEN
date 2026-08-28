"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sun, Moon, Menu, X, ChevronRight } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const NAV_LINKS = [
  { name: "Dashboard", href: "/" },
  { name: "Routes", href: "/routes" },
  { name: "Booking Window", href: "/booking-window" },
  { name: "Airlines", href: "/airlines" },
  { name: "Data Quality", href: "/data-quality" },
  { name: "Validation", href: "/validation" },
  { name: "Audit", href: "/audit" },
  { name: "Collection", href: "/collection" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [sidebarOpen]);

  return (
    <>
      <header className="w-full app-bg-surface border-b app-border sticky top-0 z-40 shadow-sm transition-colors duration-200 backdrop-blur-md bg-opacity-95">
        <div className="max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
            {/* Left: Official Government Brand Lockup */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
              <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
                {/* Crisp National Emblem of India */}
                <div className="relative h-9 w-6 sm:h-10 sm:w-7 flex items-center justify-center flex-shrink-0">
                  <Image
                    src={theme === "dark" ? "/emblem_lion_gold.png" : "/emblem_lion_dark.png"}
                    alt="National Emblem of India - MoSPI"
                    width={28}
                    height={44}
                    className="object-contain h-9 sm:h-10 w-auto opacity-95 group-hover:opacity-100 transition-opacity"
                    unoptimized
                    priority
                  />
                </div>

                {/* Stately Typography with Perfect Vertical Alignment */}
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-sm sm:text-base font-extrabold tracking-tight app-text-primary leading-tight whitespace-nowrap">
                      Project: CEN
                    </span>
                    <span className="text-[9px] font-bold uppercase app-badge-gold px-1.5 py-0.5 rounded leading-none flex-shrink-0">
                      MoSPI
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[11px] font-medium app-text-muted leading-tight mt-0.5 truncate block max-w-[180px] xs:max-w-[240px] sm:max-w-none">
                    Ministry of Statistics & Programme Implementation
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Desktop Navigation Tabs (Hidden on Mobile/Tablet) */}
            <nav className="hidden lg:flex items-center space-x-1 justify-center flex-1 max-w-4xl">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all duration-150 ${isActive
                        ? "bg-[var(--color-gold)] text-white shadow-sm font-bold"
                        : "app-text-secondary hover:app-bg-card hover:app-text-primary"
                      }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Theme Switcher (Desktop) OR Three-Dashed Hamburger Menu Button (Mobile) */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
              {/* Theme Toggle Button (Desktop Only) */}
              <button
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                className="hidden lg:flex p-2 sm:px-2.5 sm:py-1.5 rounded-md app-bg-card hover:app-bg-card-hover border app-border app-text-primary transition-all duration-150 shadow-sm items-center gap-1.5 text-xs font-medium cursor-pointer"
                title={`Switch to ${theme === "dark" ? "Light Mode" : "Dark Mode"}`}
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="w-4 h-4 text-[var(--color-gold)]" />
                    <span className="text-[11px] font-semibold app-text-primary">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-[var(--color-rose)]" />
                    <span className="text-[11px] font-semibold app-text-primary">Dark Mode</span>
                  </>
                )}
              </button>

              {/* Three-Dashed Hamburger Menu Button on RIGHT SIDE (Mobile/Tablet Only) */}
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open Navigation Menu"
                className="lg:hidden p-2 rounded-md app-bg-card hover:app-bg-card-hover border app-border app-text-primary shadow-sm flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
              >
                <Menu className="w-5 h-5 text-current" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Full-Screen Mobile Menu Drawer (Covers Entire Screen 100%) */}
      {mounted &&
        sidebarOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] h-screen w-screen overflow-hidden flex flex-col">
            {/* Full-Screen Menu Container */}
            <div
              className={`relative w-full h-full flex flex-col z-10 animate-in fade-in duration-200 ${theme === "dark"
                  ? "bg-slate-950 text-slate-100"
                  : "bg-white text-[#2C221E]"
                }`}
              style={{
                backgroundImage:
                  theme === "dark"
                    ? "linear-gradient(rgba(0, 0, 0, 0.88), rgba(11, 15, 25, 0.94)), url('/mobile_dark_cabin_bg.png')"
                    : "linear-gradient(rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.97)), url('/mobile_dark_cabin_bg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center center",
                backgroundRepeat: "no-repeat",
              }}
            >
              {/* Top Header Bar */}
              <div
                className={`p-4 sm:p-5 border-b flex items-center justify-between backdrop-blur-md ${theme === "dark"
                    ? "border-slate-800 bg-slate-900/80"
                    : "border-slate-200 bg-white/90"
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative h-8 w-6 flex items-center justify-center flex-shrink-0">
                    <Image
                      src={theme === "dark" ? "/emblem_lion_gold.png" : "/emblem_lion_dark.png"}
                      alt="MoSPI Emblem"
                      width={24}
                      height={34}
                      className="object-contain max-h-8 w-auto"
                      unoptimized
                    />
                  </div>
                  <div>
                    <div
                      className={`text-base font-extrabold ${theme === "dark" ? "text-white" : "text-[#2C221E]"
                        }`}
                    >
                      Project: CEN
                    </div>
                    <div
                      className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}
                    >
                      Ministry of Statistics & Programme Implementation
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close Menu"
                  className={`p-2 rounded-md border transition-colors cursor-pointer shadow-sm ${theme === "dark"
                      ? "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-white"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800"
                    }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links (Full Width Grid & Scrollable) */}
              <nav className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 custom-scrollbar">
                <div
                  className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}
                >
                  Menu Navigation
                </div>
                {NAV_LINKS.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-all ${isActive
                          ? "bg-[var(--color-gold)] text-white shadow-md font-bold"
                          : theme === "dark"
                            ? "bg-slate-900/80 backdrop-blur-sm text-slate-100 border border-slate-800 hover:border-[var(--color-gold)]"
                            : "bg-slate-50 text-slate-800 border border-slate-200 hover:border-[var(--color-gold)] hover:bg-slate-100"
                        }`}
                    >
                      <span>{link.name}</span>
                      <ChevronRight
                        className={`w-4 h-4 opacity-70 ${isActive
                            ? "text-white"
                            : theme === "dark"
                              ? "text-slate-400"
                              : "text-slate-500"
                          }`}
                      />
                    </Link>
                  );
                })}
              </nav>

              {/* Appearance Theme Switcher */}
              <div
                className={`p-4 sm:p-5 border-t space-y-2.5 backdrop-blur-md ${theme === "dark"
                    ? "border-slate-800 bg-slate-900/80"
                    : "border-slate-200 bg-white/90"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                  >
                    Appearance Theme
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-gold)] capitalize">
                    {theme} Mode
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => theme === "dark" && toggleTheme()}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${theme === "light"
                        ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)] shadow-sm font-bold"
                        : "bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white"
                      }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => theme === "light" && toggleTheme()}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${theme === "dark"
                        ? "bg-[var(--color-gold)] text-white border-[var(--color-gold)] shadow-sm font-bold"
                        : "bg-slate-100 text-slate-700 border-slate-300 hover:text-slate-900"
                      }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>Dark</span>
                  </button>
                </div>
              </div>

              {/* Drawer Footer Tagline */}
              <div
                className={`p-3.5 border-t text-center space-y-0.5 ${theme === "dark"
                    ? "border-slate-800 bg-slate-950/90"
                    : "border-slate-200 bg-slate-50"
                  }`}
              >
                <p
                  className={`text-xs font-semibold tracking-wide ${theme === "dark" ? "text-slate-200" : "text-slate-900"
                    }`}
                >
                  National Airfare Inflation Platform
                </p>
                <p
                  className={`text-[11px] font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                >
                  MoSPI CPI 07.3.3.1
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
