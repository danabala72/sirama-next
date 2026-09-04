"use client";

import { useState } from "react";
import { dangerClass } from "@/components/admin-ui";
import { finalizeStudent } from "@/app/(protected)/form/form-actions";

export function FinalizeStudentForm({ enabled }: { enabled: boolean }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <form
      action={finalizeStudent}
      className="rounded-lg border border-red-200 bg-red-50 p-4"
      onSubmit={(event) => {
        if (!window.confirm("Kirim dan kunci seluruh data? Setelah dikunci, data tidak dapat diubah lagi."))
          event.preventDefault();
      }}
    >
      <h3 className="font-bold text-red-900">Kirim pengajuan akhir</h3>
      <p className="mt-1 text-sm text-red-800">
        Setelah dikirim, seluruh Formulir 1–6 dikunci dan tidak dapat diubah lagi.
      </p>
      <label className="mt-3 flex items-start gap-2 text-sm text-red-900">
        <input
          type="checkbox"
          name="confirmation"
          value="yes"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          disabled={!enabled}
        />
        Saya sudah memeriksa seluruh data dan menyetujui penguncian permanen.
      </label>
      <button className={`${dangerClass} mt-3`} disabled={!enabled || !confirmed}>
        Submit dan Kunci Data
      </button>
      {!enabled && <p className="mt-2 text-xs text-red-700">Lengkapi dan simpan semua formulir terlebih dahulu.</p>}
    </form>
  );
}
