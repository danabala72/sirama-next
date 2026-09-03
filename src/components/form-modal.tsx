"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type ModalValues = Record<string, string | boolean | string[]>;

export function ModalEditButton({
  modalId,
  values,
}: {
  modalId: string;
  values: ModalValues;
}) {
  return (
    <button
      type="button"
      className="rounded bg-[#285aae] px-4 py-2 text-sm font-semibold text-white hover:bg-[#214b97]"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("open-form-modal", { detail: { modalId, values } }),
        )
      }
    >
      Edit
    </button>
  );
}

export function FormModal({
  title,
  modalId,
  triggerLabel,
  initialOpen = false,
  disabled = false,
  children,
}: {
  title: string;
  modalId: string;
  triggerLabel: string;
  initialOpen?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [values, setValues] = useState<ModalValues | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(initialOpen);
  }, [initialOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const { modalId: target, values } = (
        event as CustomEvent<{ modalId: string; values: ModalValues }>
      ).detail;
      if (target !== modalId) return;
      setValues(values);
      setOpen(true);
    };
    window.addEventListener("open-form-modal", onOpen);
    return () => window.removeEventListener("open-form-modal", onOpen);
  }, [modalId]);

  useEffect(() => {
    if (!open || !values) return;
    const root = contentRef.current;
    if (!root) return;
    root.querySelector("form")?.reset();
    for (const [name, value] of Object.entries(values)) {
        const fields = root.querySelectorAll<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >(`[name="${name}"]`);
        fields.forEach((field) => {
          if (field instanceof HTMLInputElement && field.type === "checkbox")
            field.checked = Array.isArray(value)
              ? value.includes(field.value)
              : Boolean(value);
          else
            field.value = Array.isArray(value)
              ? (value[0] ?? "")
              : String(value);
        });
    }
  }, [open, values]);

  return (
    <>
      <button
        type="button"
        className="rounded bg-[#285aae] px-4 py-2 text-sm font-semibold text-white hover:bg-[#214b97] disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => {
          setValues(null);
          setOpen(true);
        }}
        disabled={disabled}
      >
        {triggerLabel}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <section
            className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2
                id="form-modal-title"
                className="text-lg font-semibold text-slate-800"
              >
                {title}
              </h2>
              <button
                type="button"
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => setOpen(false)}
                aria-label="Tutup formulir"
              >
                <X size={20} />
              </button>
            </header>
            <div ref={contentRef} className="p-5">
              {children}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
