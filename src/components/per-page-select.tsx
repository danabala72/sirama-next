"use client";

import { useRef } from "react";

export function PerPageSelect({
  q,
  perPage,
  options,
}: {
  q: string;
  perPage: number;
  options: readonly number[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} className="flex items-center justify-between gap-2 sm:justify-start">
      {q && <input type="hidden" name="q" value={q} />}
      <label htmlFor="perPage" className="whitespace-nowrap">
        Per halaman
      </label>
      <select
        id="perPage"
        name="perPage"
        defaultValue={perPage}
        onChange={() => formRef.current?.requestSubmit()}
        className="min-h-9 rounded border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 outline-none focus:border-[#285aae]"
      >
        {options.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </form>
  );
}
