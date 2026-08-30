"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  RotateCcw,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  Building2,
  KeyRound
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function generateCaptchaCode(length: number = 6): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function LoginPage() {
  const router = useRouter();
  const { user, login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // CAPTCHA State
  const [captchaCode, setCaptchaCode] = useState("");
  const [userCaptcha, setUserCaptcha] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Modals
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Draw security CAPTCHA canvas
  const drawCaptcha = useCallback((code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = "#EEF4FA";
    ctx.fillRect(0, 0, width, height);

    // Random Background Noise Lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = "rgba(125, 140, 163, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // Characters
    const charSpacing = (width - 16) / code.length;
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      ctx.save();
      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.fillStyle = "#1E2A44";
      const x = 8 + i * charSpacing;
      const y = height / 2 + 5;
      ctx.fillText(char, x, y);
      ctx.restore();
    }
  }, []);

  // Refresh CAPTCHA
  const refreshCaptcha = useCallback(() => {
    setIsRotating(true);
    const newCode = generateCaptchaCode(6);
    setCaptchaCode(newCode);
    setUserCaptcha("");
    setCaptchaError(null);
    setTimeout(() => {
      drawCaptcha(newCode);
      setIsRotating(false);
    }, 100);
  }, [drawCaptcha]);

  useEffect(() => {
    const code = generateCaptchaCode(6);
    setCaptchaCode(code);
    setTimeout(() => drawCaptcha(code), 50);
  }, [drawCaptcha]);

  // If already authenticated, redirect to Dashboard immediately
  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setCaptchaError(null);

    if (!email || !password) return;

    if (userCaptcha.trim().toLowerCase() !== captchaCode.toLowerCase()) {
      setCaptchaError("Invalid Security Verification Code (CAPTCHA). Please try again.");
      refreshCaptcha();
      return;
    }

    const success = await login({ email, password });
    if (success) {
      router.replace("/");
    } else {
      refreshCaptcha();
    }
  };

  return (
    <div className="login-page-container min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 sm:p-6 relative">
      {/* Central Clean Government Login Box */}
      <div className="w-full max-w-md app-bg-surface border app-border rounded-xl shadow-lg p-6 sm:p-8 space-y-6">
        
        {/* Top Header: Official Emblem & Department Name */}
        <div className="text-center space-y-2 border-b app-border pb-5">
          <div className="flex justify-center">
            <Image
              src="/emblem_lion_dark.png"
              alt="National Emblem of India"
              width={32}
              height={48}
              className="object-contain max-h-12 w-auto"
              unoptimized
              priority
            />
          </div>
          <div>
            <h1 className="text-base font-extrabold app-text-primary tracking-tight">
              GOVERNMENT OF INDIA
            </h1>
            <p className="text-xs text-[var(--color-gold)] font-bold">
              Ministry of Statistics & Programme Implementation
            </p>
            <p className="text-[11px] app-text-muted">
              Project CEN • Airfare Price Index Portal
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded app-bg-card border app-border app-text-primary">
              Official Login
            </span>
          </div>
        </div>

        {/* Error Alert Banner */}
        {(error || captchaError) && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error || captchaError}</span>
          </div>
        )}

        {/* Standard Clean Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Username / Registered Email */}
          <div>
            <label className="block text-xs font-semibold app-text-primary mb-1">
              Username (Registered Email Address)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@mospi.gov.in"
              required
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg app-bg-card border app-border app-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)] focus:border-[var(--color-gold)] transition-colors placeholder:text-slate-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold app-text-primary mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3 py-2 pr-9 text-xs sm:text-sm rounded-lg app-bg-card border app-border app-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)] focus:border-[var(--color-gold)] transition-colors placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Single-Line CAPTCHA Section */}
          <div>
            <label className="block text-xs font-semibold app-text-primary mb-1">
              Security Code (CAPTCHA)
            </label>
            <div className="flex items-center gap-2">
              {/* CAPTCHA Canvas Badge */}
              <div className="flex-shrink-0">
                <canvas
                  ref={canvasRef}
                  width={110}
                  height={36}
                  data-captcha={captchaCode}
                  className="rounded-lg border app-border block select-none cursor-pointer bg-slate-800"
                  onClick={refreshCaptcha}
                  title="Click to reload CAPTCHA"
                />
              </div>

              {/* Reload Button */}
              <button
                type="button"
                onClick={refreshCaptcha}
                className="p-2 rounded-lg app-bg-card hover:app-bg-card-hover border app-border text-slate-400 hover:text-[var(--color-gold)] transition-colors cursor-pointer flex-shrink-0"
                title="Reload CAPTCHA"
              >
                <RotateCcw className={`w-4 h-4 ${isRotating ? "animate-spin" : ""}`} />
              </button>

              {/* Input Field in the same line */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={userCaptcha}
                  onChange={(e) => setUserCaptcha(e.target.value)}
                  placeholder="Enter code"
                  maxLength={6}
                  required
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono tracking-wider rounded-lg app-bg-card border app-border app-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)] focus:border-[var(--color-gold)] transition-colors placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Login Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#1E2A44] hover:bg-[#111827] text-[#F5F3EC] font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer disabled:opacity-50 border border-[#111827]"
            >
              {isLoading ? "Verifying..." : "Login"}
            </button>
          </div>

          {/* Footer links: New User? | Forgot Password? */}
          <div className="flex items-center justify-center gap-2 pt-1 text-xs app-text-muted">
            <button
              type="button"
              onClick={() => setShowRegisterModal(true)}
              className="hover:text-[var(--color-gold)] transition-colors cursor-pointer"
            >
              New User?
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="hover:text-[var(--color-gold)] transition-colors cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal (Theme-Adaptive) */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="app-bg-surface border app-border rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between app-text-primary font-bold text-sm">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[var(--color-gold)]" />
                <span>Password Reset</span>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="app-text-muted hover:app-text-primary p-1 cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs app-text-secondary leading-relaxed">
              For official password reset, contact the <strong className="app-text-primary">MoSPI / NIC Helpdesk</strong> at <span className="font-mono text-[var(--color-gold)] font-bold">cpi.support@mospi.gov.in</span> or use credentials <span className="font-mono app-text-primary font-bold">director.cpi@mospi.gov.in / Password@123</span>.
            </p>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-[#2E4A6B] hover:bg-[#1E2A44] text-[#F5F3EC] font-bold text-xs rounded-lg transition-colors cursor-pointer border border-[#7D8CA3]/50 shadow-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* New User Modal (Theme-Adaptive) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="app-bg-surface border app-border rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between app-text-primary font-bold text-sm">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--color-gold)]" />
                <span>New User Registration</span>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="app-text-muted hover:app-text-primary p-1 cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs app-text-secondary leading-relaxed">
              Official accounts for <strong className="app-text-primary">Project CEN</strong> are provisioned through the MoSPI Computer Centre / NSO Division for verified government personnel.
            </p>
            <button
              onClick={() => setShowRegisterModal(false)}
              className="w-full py-2 bg-[#2E4A6B] hover:bg-[#1E2A44] text-[#F5F3EC] font-bold text-xs rounded-lg transition-colors cursor-pointer border border-[#7D8CA3]/50 shadow-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
