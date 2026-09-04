"use client";

import { useOptimistic, useTransition } from "react";

export function StatusToggleButton({
  id,
  active,
  action,
}: {
  id: string;
  active: boolean;
  action: (fd: FormData) => Promise<void>;
}) {
  const [checked, setChecked] = useOptimistic(
    active,
    (_current, next: boolean) => next,
  );
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !checked;
    const formData = new FormData();
    formData.set("id", id);
    startTransition(async () => {
      setChecked(next);
      await action(formData);
    });
  }

  return (
    <button
      type="button"
      className={`group inline-flex h-9 w-full items-center justify-center gap-2 rounded-full border px-2 text-xs font-semibold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#285aae] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${
        checked
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-500"
      }`}
      aria-pressed={checked}
      disabled={pending}
      onClick={toggle}
    >
      <span
        className={`relative h-5 w-9 rounded-full transition-colors duration-300 ease-out ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
      <span className="w-12 text-left">{checked ? "Aktif" : "Nonaktif"}</span>
    </button>
  );
}
