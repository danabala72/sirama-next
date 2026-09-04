"use client";

import TomSelect from "tom-select";
import { useEffect, useRef } from "react";

type Assessor = { id: string; name: string; jurusanId: string | null };

export function AssessorSelect({
  assessors,
  selected = [],
  jurusanId,
}: {
  assessors: Assessor[];
  selected?: string[];
  jurusanId?: string;
}) {
  const ref = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const select = ref.current;
    const control = new TomSelect(select, {
      plugins: ["remove_button"],
      placeholder: "Cari dan pilih asesor",
      closeAfterSelect: false,
    });
    const jurusanSelect = select.form?.querySelector<HTMLSelectElement>(
      '[name="jurusanId"]',
    );
    const filter = () => {
      const jurusanId = jurusanSelect?.value;
      const selectedValues = control.getValue();
      control.clearOptions();
      control.addOption(
        assessors
          .filter((assessor) => assessor.jurusanId === jurusanId)
          .map((assessor) => ({ value: assessor.id, text: assessor.name })),
      );
      control.setValue(
        (Array.isArray(selectedValues) ? selectedValues : [selectedValues]).filter(
          (value) => assessors.some((assessor) => assessor.id === value && assessor.jurusanId === jurusanId),
        ),
      );
    };
    const onJurusanChange = () => {
      control.clear(true);
      filter();
    };
    jurusanSelect?.addEventListener("change", onJurusanChange);
    return () => {
      jurusanSelect?.removeEventListener("change", onJurusanChange);
      control.destroy();
    };
  }, [assessors]);

  return (
    <select ref={ref} name="asesorIds" multiple defaultValue={selected}>
      {assessors
        .filter(
          (assessor) =>
            !jurusanId ||
            assessor.jurusanId === jurusanId ||
            selected.includes(assessor.id),
        )
        .map((assessor) => (
        <option key={assessor.id} value={assessor.id}>
          {assessor.name}
        </option>
        ))}
    </select>
  );
}
