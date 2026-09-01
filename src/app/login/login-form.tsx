"use client";

import { useActionState } from "react";
import { LockKeyhole, LogIn, UserRound } from "lucide-react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return <form action={action} className="space-y-5">
    {state.error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>}
    <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Username atau email</span><span className="relative block"><UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input name="username" autoComplete="username" required placeholder="Masukkan username atau email" className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-3 outline-none transition focus:border-[#285aae] focus:ring-3 focus:ring-blue-100" /></span></label>
    <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">Password</span><span className="relative block"><LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input name="password" type="password" autoComplete="current-password" required placeholder="Masukkan password" className="w-full rounded-lg border border-slate-300 py-3 pl-11 pr-3 outline-none transition focus:border-[#285aae] focus:ring-3 focus:ring-blue-100" /></span></label>
    <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#285aae] px-4 py-3 font-semibold text-white transition hover:bg-[#1d4e9a] disabled:cursor-not-allowed disabled:opacity-60"><LogIn size={18}/>{pending ? "Memproses…" : "Masuk"}</button>
  </form>;
}
