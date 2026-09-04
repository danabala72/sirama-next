import Link from "next/link";
import type { ReactNode } from "react";
import { PerPageSelect } from "./per-page-select";

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
  "inline-flex min-h-9 items-center justify-center rounded bg-[#285aae] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-[#214b97]";
export const dangerClass =
  "inline-flex min-h-8 items-center justify-center rounded border border-red-200 px-3 py-1.5 text-center text-xs font-semibold text-red-600 hover:bg-red-50";
export function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-8 text-center text-sm text-slate-400">
        Belum ada data.
      </td>
    </tr>
  );
}

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function readListParams(params: {
  q?: string;
  page?: string;
  perPage?: string;
}) {
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const requested = Number(params.perPage ?? DEFAULT_PAGE_SIZE);
  const perPage = PAGE_SIZE_OPTIONS.includes(
    requested as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? requested
    : DEFAULT_PAGE_SIZE;
  return { q, page, perPage, skip: (page - 1) * perPage, take: perPage };
}

export function SearchBox({
  q,
  perPage,
  placeholder = "Cari data...",
}: {
  q: string;
  perPage: number;
  placeholder?: string;
}) {
  return (
    <form className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,24rem)_auto_auto] sm:items-center">
      <input type="hidden" name="perPage" value={perPage} />
      <input
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        className={inputClass}
      />
      <button className={`${buttonClass} w-full sm:w-auto`}>Cari</button>
      {q && (
        <Link
          href="?"
          className="inline-flex min-h-9 w-full items-center justify-center rounded border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:w-auto"
        >
          Reset
        </Link>
      )}
    </form>
  );
}

export function Pagination({
  page,
  perPage,
  total,
  q,
}: {
  page: number;
  perPage: number;
  total: number;
  q: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const href = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (perPage !== DEFAULT_PAGE_SIZE) params.set("perPage", String(perPage));
    if (target > 1) params.set("page", String(target));
    const value = params.toString();
    return value ? `?${value}` : "?";
  };
  return (
    <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600 md:flex md:items-center md:justify-between">
      <span className="text-center md:text-left">
        {total
          ? `${(page - 1) * perPage + 1}-${Math.min(page * perPage, total)} dari ${total}`
          : "0 data"}
      </span>
      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
        <PerPageSelect q={q} perPage={perPage} options={PAGE_SIZE_OPTIONS} />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Link
            href={href(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={`rounded border px-3 py-1.5 text-center font-semibold ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
          >
            Sebelumnya
          </Link>
          <span className="whitespace-nowrap">
            {page} / {totalPages}
          </span>
          <Link
            href={href(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={`rounded border px-3 py-1.5 text-center font-semibold ${page >= totalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
          >
            Berikutnya
          </Link>
        </div>
      </div>
    </div>
  );
}
