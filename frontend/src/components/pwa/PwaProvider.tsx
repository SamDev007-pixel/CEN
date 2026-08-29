"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Download, RefreshCw, WifiOff, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaContextType {
  isInstallable: boolean;
  isStandalone: boolean;
  isOffline: boolean;
  installPwa: () => Promise<void>;
  updateAvailable: boolean;
  applyUpdate: () => void;
}

const PwaContext = createContext<PwaContextType>({
  isInstallable: false,
  isStandalone: false,
  isOffline: false,
  installPwa: async () => {},
  updateAvailable: false,
  applyUpdate: () => {},
});

export const usePwa = () => useContext(PwaContext);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes("android-app://");

    setIsStandalone(isStandaloneMode);

    // Online / Offline tracking
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Check for waiting worker
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            setUpdateAvailable(true);
          }

          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  setWaitingWorker(newWorker);
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn("PWA Service Worker registration failed:", err);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
      
      // Check if user dismissed recently
      const dismissed = localStorage.getItem("airindex_pwa_dismissed");
      const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
      const now = Date.now();
      // Show prompt if never dismissed or dismissed more than 3 days ago
      if (!isStandaloneMode && (now - dismissedTime > 3 * 24 * 60 * 60 * 1000)) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const installPwa = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstallable(false);
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.error("Installation failed:", error);
    }
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem("airindex_pwa_dismissed", Date.now().toString());
  };

  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  return (
    <PwaContext.Provider
      value={{
        isInstallable,
        isStandalone,
        isOffline,
        installPwa,
        updateAvailable,
        applyUpdate,
      }}
    >
      {children}

      {/* Offline Status Bar */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600/95 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md backdrop-blur-sm animate-in slide-in-from-top">
          <WifiOff className="w-4 h-4" />
          <span>You are currently offline. Displaying cached airfare data and offline shell.</span>
        </div>
      )}

      {/* Update Available Toast */}
      {updateAvailable && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900 border border-[var(--color-gold)]/40 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-gold)]/20 text-[var(--color-gold)] flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white leading-tight">Update Ready</p>
              <p className="text-[11px] text-slate-400 truncate">A new AirIndex build is available.</p>
            </div>
          </div>
          <button
            onClick={applyUpdate}
            className="px-3 py-1.5 bg-[var(--color-gold)] hover:bg-[var(--color-gold)]/90 text-slate-950 font-bold text-xs rounded-lg transition-colors flex-shrink-0 shadow-sm cursor-pointer"
          >
            Reload
          </button>
        </div>
      )}

      {/* Modern PWA Install Banner */}
      {showInstallBanner && isInstallable && !isStandalone && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-slate-900/95 border border-slate-700 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 p-1 flex items-center justify-center flex-shrink-0">
                <img
                  src="/icon-192x192.png"
                  alt="AirIndex Logo"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-white">Install AirIndex App</h4>
                  <span className="text-[9px] font-bold uppercase bg-[var(--color-gold)]/20 text-[var(--color-gold)] px-1.5 py-0.5 rounded">
                    PWA
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Install on your desktop or mobile home screen for quick offline access and real-time alerts.
                </p>
              </div>
            </div>
            <button
              onClick={dismissInstallBanner}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              aria-label="Dismiss install prompt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
            <button
              onClick={dismissInstallBanner}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white font-medium transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={installPwa}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--color-gold)] hover:bg-[var(--color-gold)]/90 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install Now</span>
            </button>
          </div>
        </div>
      )}
    </PwaContext.Provider>
  );
}
