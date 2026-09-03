import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      {children}
    </section>
  );
}
export function Notice({ text }: { text?: string }) {
  if (!text) return null;
  const bad = text.startsWith("Error:");
  return (
    <div
      className={`mb-4 rounded border px-4 py-3 text-sm ${bad ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
    >
      {text}
    </div>
  );
}
export const inputClass =
  "w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#285aae]";
export const buttonClass =
  "rounded bg-[#285aae] px-4 py-2 text-sm font-semibold text-white hover:bg-[#214b97]";
export const dangerClass =
  "rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50";
export function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-8 text-center text-sm text-slate-400">
        Belum ada data.
      </td>
    </tr>
  );
}
