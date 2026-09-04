"use client";
import { useState } from "react";
export function SelectAllCheckbox() {
  const [checked, setChecked] = useState(false);
  return <label className="mb-2 flex items-center justify-end gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(e) => { setChecked(e.target.checked); e.currentTarget.form?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => { if (input !== e.currentTarget) input.checked = e.target.checked; }); }} />Pilih semua</label>;
}
