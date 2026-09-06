"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  CalendarDays,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  School,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { RoleName } from "@/lib/session";

type Item = {
  href: string;
  label: string;
  icon: typeof Home;
  roles?: RoleName[];
};
const items: Item[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Home,
    roles: ["Admin", "AdminJurusan"],
  },
  {
    href: "/semester",
    label: "Semester",
    icon: CalendarDays,
    roles: ["Admin"],
  },
  {
    href: "/jurusan",
    label: "Jurusan",
    icon: GraduationCap,
    roles: ["Admin", "AdminJurusan"],
  },
  {
    href: "/skema",
    label: "Skema",
    icon: BookOpenCheck,
    roles: ["Admin", "AdminJurusan"],
  },
  {
    href: "/mata-kuliah",
    label: "Mata Kuliah",
    icon: School,
    roles: ["Admin", "AdminJurusan"],
  },
  {
    href: "/asesor",
    label: "Asesor",
    icon: ShieldCheck,
    roles: ["Admin", "AdminJurusan"],
  },
  {
    href: "/mahasiswa",
    label: "Mahasiswa",
    icon: Users,
    roles: ["Admin", "AdminJurusan"],
  },
  {
    href: "/admin-jurusan",
    label: "Admin Jurusan",
    icon: UserCog,
    roles: ["Admin"],
  },
  {
    href: "/asesmen",
    label: "Asesmen Transfer SKS",
    icon: BookOpenCheck,
    roles: ["Asesor"],
  },
  ...Array.from({ length: 6 }, (_, i): Item => ({
    href: `/form?step=${i + 1}`,
    label: `Formulir ${i + 1}`,
    icon: BookOpenCheck,
    roles: ["Mahasiswa"],
  })),
  { href: "/profile", label: "Profil", icon: Settings },
];

export function AppShell({
  children,
  username,
  role,
}: {
  children: ReactNode;
  username: string;
  role: RoleName;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visible = items.filter(
    (item) => !item.roles || item.roles.includes(role),
  );

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-[#eef2f6] text-slate-800">
      <header className="px-2 pt-2 md:px-3 md:pt-3">
        <div className="flex min-h-16 overflow-hidden rounded-t bg-[#1d4e9a] text-white shadow-sm md:h-[78px]">
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2 bg-[#285aae] px-3 sm:max-w-[330px] sm:gap-3 sm:px-4"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/50 bg-white sm:size-10">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="size-7 object-contain sm:size-8" />
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-xs sm:text-sm">
                Sistem Rekrutmen Mahasiswa RPL
              </strong>
              <small className="block truncate text-xs text-white/80">Politeknik Negeri Bali</small>
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center justify-end gap-2 px-2 sm:gap-3 sm:px-4">
            <button
              onClick={() => setOpen(!open)}
              className="rounded p-2 hover:bg-white/10 lg:hidden"
              aria-label="Menu"
              aria-controls="application-sidebar"
              aria-expanded={open}
            >
              <Menu />
            </button>
            <span className="hidden text-sm md:inline">
              Selamat datang, <strong>{username}</strong>
            </span>
            <form action="/logout" method="post">
              <button type="submit" aria-label="Log out" title="Log out" className="rounded bg-white p-2 text-[#214b97] hover:bg-slate-100">
                <LogOut size={18} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="min-h-[calc(100vh-90px)]">
        {open && (
          <button
            type="button"
            aria-label="Tutup menu"
            className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
        <aside
          id="application-sidebar"
          className={`fixed inset-y-0 left-0 z-50 w-[min(82vw,300px)] overflow-y-auto border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 ease-out lg:bottom-0 lg:top-[90px] lg:z-30 lg:w-[260px] lg:translate-x-0 lg:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex h-[72px] items-center justify-between border-b border-slate-200 bg-[#285aae] px-4 text-white lg:hidden">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full border border-white/50">
                <GraduationCap size={21} />
              </span>
              <span className="text-sm font-semibold">Menu SIRAMA</span>
            </div>
            <button
              type="button"
              className="rounded p-2 hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
            >
              <X size={22} />
            </button>
          </div>
          <nav className="space-y-1 p-4">
            {visible.map(({ href, label, icon: Icon }) => {
              const active = pathname === href.split("?")[0];
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${active ? "bg-[#285aae] text-white" : "text-slate-600 hover:bg-slate-100 hover:text-[#214b97]"}`}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 p-3 md:p-4 lg:ml-[260px]">{children}</main>
      </div>
    </div>
  );
}
