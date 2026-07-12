"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../components/ThemeToggle";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const BACKEND_URL = "http://localhost:5005/api/auth";

  const handleLogin = async (e: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const loginEmail = customEmail || email;
    const loginPassword = customPassword || password;

    try {
      const res = await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to log in");
      }

      localStorage.setItem("transitops_token", data.token);
      localStorage.setItem("transitops_user", JSON.stringify(data.user));
      router.push("/");
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (roleEmail: string) => {
    handleLogin(null as any, roleEmail, "password123");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Fixed theme toggle — top-right corner */}
      <div style={{ position: "fixed", top: "16px", right: "16px", zIndex: 100 }}>
        <ThemeToggle />
      </div>
      {/* Animated background mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{
            background: "radial-gradient(circle, #2563eb 0%, transparent 70%)",
            animation: "meshMove 18s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{
            background: "radial-gradient(circle, #0ea5e9 0%, transparent 70%)",
            animation: "meshMove 24s ease-in-out infinite reverse",
          }}
        />
        {/* Subtle grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#60a5fa" strokeWidth="0.8"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Login Card */}
      <div
        className="relative w-full max-w-md animate-scale-up"
        style={{ zIndex: 10 }}
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5">
            <div
              className="p-3.5 rounded-2xl shadow-2xl"
              style={{
                background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #0ea5e9 100%)",
                boxShadow: "0 8px 32px rgba(37, 99, 235, 0.4), 0 2px 8px rgba(0,0,0,0.5)",
              }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16v-4a1 1 0 00-1-1h-7m7 5H3" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            TransitOps
          </h1>
          <p className="mt-1.5 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            Smart Transport Operations Platform
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span
              className="badge"
              style={{
                background: "rgba(37,99,235,0.12)",
                color: "#60a5fa",
                border: "1px solid rgba(37,99,235,0.25)",
              }}
            >
              Enterprise Edition
            </span>
            <span
              className="badge"
              style={{
                background: "rgba(16,185,129,0.1)",
                color: "#34d399",
                border: "1px solid rgba(16,185,129,0.2)",
              }}
            >
              v1.0
            </span>
          </div>
        </div>

        {/* Form Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--login-card-shadow)",
          }}
        >
          {/* Card Top Accent Line */}
          <div
            style={{
              height: "2px",
              background: "linear-gradient(90deg, #1d4ed8, #2563eb, #0ea5e9, transparent)",
            }}
          />

          <div className="p-8">
            {/* Error Message */}
            {errorMsg && (
              <div
                className="mb-5 p-3.5 rounded-xl flex items-center gap-3 text-sm font-medium animate-fade-in"
                style={{
                  background: "rgba(244, 63, 94, 0.08)",
                  border: "1px solid rgba(244, 63, 94, 0.2)",
                  color: "#fb7185",
                }}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={(e) => handleLogin(e)}>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. manager@transitops.com"
                  style={{
                    width: "100%",
                    background: "var(--bg-base)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "10px",
                    padding: "10px 16px",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "#2563eb";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.15)";
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = "var(--border-default)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    background: "var(--bg-base)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "10px",
                    padding: "10px 16px",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "#2563eb";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.15)";
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = "var(--border-default)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "11px 24px",
                  borderRadius: "10px",
                  background: loading
                    ? "rgba(37,99,235,0.5)"
                    : "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
                  transition: "all 0.2s ease",
                  marginTop: "8px",
                  opacity: loading ? 0.7 : 1,
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    (e.target as HTMLButtonElement).style.boxShadow = "0 6px 24px rgba(37,99,235,0.5)";
                    (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={e => {
                  (e.target as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(37,99,235,0.3)";
                  (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                }}
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to TransitOps
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Demo Logins */}
            <div
              className="mt-7 pt-6"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <p
                className="text-center text-xs uppercase font-semibold tracking-widest mb-4"
                style={{ color: "var(--text-muted)" }}
              >
                Quick Demo Access
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: "Fleet Manager", email: "manager@transitops.com", color: "#60a5fa", accent: "rgba(37,99,235,0.12)", border: "rgba(37,99,235,0.25)" },
                  { label: "Dispatcher", email: "dispatcher@transitops.com", color: "#34d399", accent: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
                  { label: "Safety Officer", email: "safety@transitops.com", color: "#fbbf24", accent: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
                  { label: "Financial Analyst", email: "analyst@transitops.com", color: "#a78bfa", accent: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.2)" },
                ].map((role) => (
                  <button
                    key={role.email}
                    id={`demo-login-${role.label.toLowerCase().replace(/\s+/g, "-")}`}
                    onClick={() => handleDemoLogin(role.email)}
                    style={{
                      background: role.accent,
                      border: `1px solid ${role.border}`,
                      borderRadius: "10px",
                      padding: "10px 12px",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 16px ${role.border}`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                    }}
                  >
                    <div className="text-xs font-bold" style={{ color: role.color }}>
                      {role.label}
                    </div>
                    <div className="text-[10px] mt-0.5 font-mono truncate" style={{ color: "var(--text-muted)" }}>
                      {role.email}
                    </div>
                  </button>
                ))}
              </div>
              <p
                className="text-center text-[10px] mt-3"
                style={{ color: "var(--text-muted)" }}
              >
                All demo accounts use password: <span className="font-mono font-semibold" style={{ color: "var(--text-secondary)" }}>password123</span>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] mt-6" style={{ color: "var(--text-muted)" }}>
          © 2025 TransitOps. Enterprise Transport Management System.
        </p>
      </div>
    </div>
  );
}
