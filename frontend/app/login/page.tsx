"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const BACKEND_URL = "http://localhost:5000/api/auth";

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

      // Save token and user details to localStorage
      localStorage.setItem("transitops_token", data.token);
      localStorage.setItem("transitops_user", JSON.stringify(data.user));

      // Redirect to dashboard
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center items-center gap-3">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-3 rounded-xl shadow-lg shadow-violet-600/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16v-4a1 1 0 00-1-1h-7m7 5H3"/></svg>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-100 uppercase tracking-wide">
          TransitOps Sign In
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Smart Transport Operations Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-4 shadow-2xl rounded-xl sm:px-10">
          
          {errorMsg && (
            <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm font-medium flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={(e) => handleLogin(e)}>
            <div>
              <label htmlFor="email" className="block text-xs uppercase tracking-wider font-semibold text-slate-400">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs uppercase tracking-wider font-semibold text-slate-400">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 transition-all"
              >
                {loading ? "Authenticating..." : "Sign In"}
              </button>
            </div>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <span className="block text-center text-xs uppercase tracking-wider font-semibold text-slate-500 mb-4">
              Quick Demo Logins
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
              <button
                onClick={() => handleDemoLogin("manager@transitops.com")}
                className="bg-slate-950 border border-slate-800 hover:border-violet-500/50 hover:bg-slate-800/40 text-violet-400 p-2.5 rounded-lg text-left transition-all"
              >
                Fleet Manager
                <span className="block text-[10px] text-slate-500 mt-0.5">manager@transitops.com</span>
              </button>
              <button
                onClick={() => handleDemoLogin("driver@transitops.com")}
                className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/40 text-emerald-400 p-2.5 rounded-lg text-left transition-all"
              >
                Driver Role
                <span className="block text-[10px] text-slate-500 mt-0.5">driver@transitops.com</span>
              </button>
              <button
                onClick={() => handleDemoLogin("safety@transitops.com")}
                className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/40 text-amber-400 p-2.5 rounded-lg text-left transition-all"
              >
                Safety Officer
                <span className="block text-[10px] text-slate-500 mt-0.5">safety@transitops.com</span>
              </button>
              <button
                onClick={() => handleDemoLogin("analyst@transitops.com")}
                className="bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/40 text-indigo-400 p-2.5 rounded-lg text-left transition-all"
              >
                Financial Analyst
                <span className="block text-[10px] text-slate-500 mt-0.5">analyst@transitops.com</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
