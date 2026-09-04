"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonClass, inputClass } from "@/components/admin-ui";
import type { TemplateName } from "@/lib/excel/workbook";

type JurusanOption = {
  id: string;
  name: string;
};

export function TemplateImportForm({
  name,
  title,
  description,
  jurusanOptions = [],
  requireJurusan = false,
}: {
  name: TemplateName;
  title: string;
  description: string;
  jurusanOptions?: JurusanOption[];
  requireJurusan?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/import/${name}`, {
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
      if (!response.ok) throw new Error(result.message || "Import gagal.");

      const summary = `${result.success ?? 0} dari ${result.total ?? 0} baris berhasil`;
      const firstError = result.errors?.[0];
      setMessage(
        firstError
          ? `${summary}. Baris ${firstError.row}: ${firstError.message}`
          : `${summary}.`,
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div>
        <div className="font-semibold">{title}</div>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      {requireJurusan && (
        <select className={inputClass} name="jurusan_id" required defaultValue="">
          <option value="" disabled>
            Pilih jurusan
          </option>
          {jurusanOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      )}
      <input
        className={inputClass}
        type="file"
        name="file"
        accept=".xlsx"
        required
      />
      <div className="flex flex-wrap items-center gap-3">
        <button className={buttonClass} disabled={busy}>
          {busy ? "Mengimpor..." : "Import"}
        </button>
        <a
          className="text-sm font-semibold text-blue-700 underline"
          href={`/api/templates/${name}`}
        >
          Unduh template
        </a>
      </div>
      {message && <p className="text-sm text-slate-700">{message}</p>}
    </form>
  );
}
