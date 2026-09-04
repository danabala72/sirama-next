"use client";
import { useEffect, useRef, useState } from "react";

export function ReportMenu({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", close, true);
    return () => document.removeEventListener("click", close, true);
  }, []);
  return <div ref={ref} className="relative"><button type="button" onClick={() => setOpen(!open)} className="inline-flex min-h-9 items-center justify-center rounded border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Laporan</button>{open && <div className="absolute right-0 z-10 mt-1 grid min-w-32 gap-1 rounded border border-slate-200 bg-white p-1 text-sm shadow-sm">{(["final", "formal", "nonformal"] as const).map((kind) => <a key={kind} href={`/api/mahasiswa/${studentId}/laporan/${kind}`} className="rounded px-3 py-2 text-center capitalize hover:bg-slate-50">{kind}</a>)}</div>}</div>;
}
