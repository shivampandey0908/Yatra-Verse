"use client";

import { FormEvent, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const body = mode === "login"
      ? { email, password: form.get("password") }
      : { name: form.get("name"), email, password: form.get("password"), role: form.get("role") };

    try {
      const res = await fetch(`${API}/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error?.message ?? "Unable to continue.");

      sessionStorage.setItem("yv_access_token", json.data.accessToken);
      window.dispatchEvent(new Event("yv-auth-change"));
      window.location.assign(json.data.user.roles.includes("guide") ? "/guide" : "/account");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="mx-auto grid min-h-[calc(100vh-160px)] max-w-5xl place-items-center px-5 py-16"><div className="w-full max-w-md rounded-3xl border border-violet-100 bg-white p-8 shadow-float"><p className="text-sm font-bold tracking-[.18em] text-plum">YATRA VERSE</p><h1 className="mt-3 font-serif text-4xl text-ink">{mode === "login" ? "Welcome back." : "Begin your journey."}</h1><form className="mt-8 space-y-4" onSubmit={submit}>{mode === "register" && <><label className="block text-sm font-medium text-slate-700">Name<input required name="name" minLength={2} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-plum" /></label><label className="block text-sm font-medium text-slate-700">I’m joining as<select name="role" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-plum"><option value="traveler">Traveler</option><option value="guide">Local guide</option></select></label></>}<label className="block text-sm font-medium text-slate-700">Email<input required name="email" type="email" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-plum" /></label><label className="block text-sm font-medium text-slate-700">Password<input required name="password" type="password" minLength={mode === "register" ? 12 : 1} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-plum" /></label><button disabled={busy} className="w-full rounded-full bg-plum px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button></form>{message && <p className="mt-5 rounded-xl bg-lavender p-3 text-sm text-ink" role="status">{message}</p>}<button className="mt-6 text-sm font-semibold text-plum" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMessage(""); }}>{mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}</button></div></section>;
}
