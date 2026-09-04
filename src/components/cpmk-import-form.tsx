"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonClass, inputClass } from "@/components/admin-ui";

export function CpmkImportForm({ kodeMk }: { kodeMk: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/import/cpmk", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const result = (await response.json()) as {
        message?: string;
        total?: number;
        success?: number;
        failed?: number;
        errors?: Array<{ row: number; message: string }>;
      };
      if (!response.ok && response.status !== 207)
        throw new Error(result.message || "Import CPMK gagal.");
      const summary = `${result.success ?? 0} dari ${result.total ?? 0} baris berhasil`;
      const firstError = result.errors?.[0];
      setMessage(
        firstError
          ? `${summary}. Baris ${firstError.row}: ${firstError.message}`
          : `${summary}.`,
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import CPMK gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border bg-slate-50 p-4">
      <div>
        <div className="font-semibold">Import CPMK</div>
        <p className="text-sm text-slate-600">
          File diproses ke semester aktif berdasarkan kolom kode_mk.
        </p>
      </div>
      <input
        className={inputClass}
        type="file"
        name="file"
        accept=".xlsx"
        required
      />
      <div className="flex flex-wrap items-center gap-3">
        <button className={buttonClass} disabled={busy}>
          {busy ? "Mengimpor..." : "Import CPMK"}
        </button>
        <a
          className="text-sm font-semibold text-blue-700 underline"
          href={`/api/templates/cpmk?kode_mk=${encodeURIComponent(kodeMk)}`}
        >
          Unduh template CPMK
        </a>
      </div>
      {message && <p className="text-sm text-slate-700">{message}</p>}
    </form>
  );
}
