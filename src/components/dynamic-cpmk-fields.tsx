"use client";

import { useState } from "react";
import { inputClass } from "./admin-ui";

export function DynamicCpmkFields({
  name,
  initialValues,
  disabled = false,
}: {
  name: string;
  initialValues: string[];
  disabled?: boolean;
}) {
  const [values, setValues] = useState(initialValues.length ? initialValues : [""]);
  return (
    <div className="grid gap-2">
      {values.map((value, index) => (
        <div key={index} className="flex gap-2">
          <textarea
            className={`${inputClass} min-h-20 flex-1`}
            name={name}
            value={value}
            onChange={(event) => setValues((current) => current.map((item, i) => (i === index ? event.target.value : item)))}
            placeholder={`CPMK asal ${index + 1}`}
            disabled={disabled}
            required
          />
          {!disabled && values.length > 1 && (
            <button type="button" className="h-9 rounded border border-red-200 px-3 text-sm text-red-600" onClick={() => setValues((current) => current.filter((_, i) => i !== index))} aria-label={`Hapus CPMK ${index + 1}`}>
              ×
            </button>
          )}
        </div>
      ))}
      {!disabled && <button type="button" className="w-fit text-sm font-semibold text-[#285aae]" onClick={() => setValues((current) => [...current, ""])}>
        + Tambah CPMK
      </button>}
    </div>
  );
}
