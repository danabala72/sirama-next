"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, CalendarDays, GraduationCap, Home, Menu, School, Settings, ShieldCheck, UserCog, Users, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { RoleName } from "@/lib/session";

type Item = { href: string; label: string; icon: typeof Home; roles?: RoleName[] };
const items: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, roles: ["Admin", "AdminJurusan"] },
  { href: "/semester", label: "Semester", icon: CalendarDays, roles: ["Admin"] },
  { href: "/jurusan", label: "Jurusan", icon: GraduationCap, roles: ["Admin", "AdminJurusan"] },
  { href: "/mata-kuliah", label: "Mata Kuliah", icon: School, roles: ["Admin", "AdminJurusan"] },
  { href: "/asesor", label: "Asesor", icon: ShieldCheck, roles: ["Admin", "AdminJurusan"] },
  { href: "/mahasiswa", label: "Mahasiswa", icon: Users, roles: ["Admin", "AdminJurusan"] },
  { href: "/admin-jurusan", label: "Admin Jurusan", icon: UserCog, roles: ["Admin"] },
  { href: "/asesmen", label: "Asesmen Transfer SKS", icon: BookOpenCheck, roles: ["Asesor"] },
  ...Array.from({ length: 6 }, (_, i): Item => ({ href: `/form?step=${i + 1}`, label: `Formulir ${i + 1}`, icon: BookOpenCheck, roles: ["Mahasiswa"] })),
  { href: "/profile", label: "Profil", icon: Settings },
];

export function AppShell({ children, username, role }: { children: ReactNode; username: string; role: RoleName }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visible = items.filter((item) => !item.roles || item.roles.includes(role));
  return <div className="min-h-screen bg-[#eef2f6] text-slate-800"><header className="px-2 pt-2 md:px-3 md:pt-3"><div className="flex h-[78px] overflow-hidden rounded-t bg-[#1d4e9a] text-white shadow-sm"><Link href="/" className="flex w-[330px] max-w-[72%] items-center gap-3 bg-[#285aae] px-4"><span className="grid size-10 place-items-center rounded-full border border-white/50"><GraduationCap size={24}/></span><span><strong className="block text-sm">Sistem Rekrutmen Mahasiswa RPL</strong><small className="text-white/80">Politeknik Negeri Bali</small></span></Link><div className="flex flex-1 items-center justify-end gap-3 px-4"><button onClick={() => setOpen(!open)} className="mr-auto rounded p-2 hover:bg-white/10 lg:hidden" aria-label="Menu">{open ? <X/> : <Menu/>}</button><span className="hidden text-sm md:inline">Selamat datang, <strong>{username}</strong></span><form action="/logout" method="post"><button className="rounded bg-white px-3 py-1.5 text-sm font-semibold text-[#214b97]">Log Out</button></form></div></div></header><div className="grid min-h-[calc(100vh-90px)] lg:grid-cols-[330px_1fr]"><aside className={`${open ? "block" : "hidden"} border-r border-slate-200 bg-white lg:block`}><nav className="space-y-1 p-4">{visible.map(({href,label,icon:Icon}) => { const active = pathname === href.split("?")[0]; return <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${active ? "bg-[#285aae] text-white" : "text-slate-600 hover:bg-slate-100 hover:text-[#214b97]"}`}><Icon size={18}/>{label}</Link>; })}</nav></aside><main className="min-w-0 p-3 md:p-4">{children}</main></div></div>;
}
