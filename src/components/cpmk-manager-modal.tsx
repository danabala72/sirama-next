"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { buttonClass, inputClass } from "@/components/admin-ui";
import { CpmkImportForm } from "@/components/cpmk-import-form";
import { FormModal } from "@/components/form-modal";

type CpmkItem = {
  id: string;
  indikatorCapaian: string;
};

type SaveCpmkResult =
  | { ok: true; message: string; item: CpmkItem }
  | { ok: false; message: string };
type DeleteCpmkResult =
  | { ok: true; message: string; id: string }
  | { ok: false; message: string };
type ReloadCpmkResult =
  | { ok: true; items: CpmkItem[] }
  | { ok: false; message: string };

export function CpmkManagerModal({
  courseId,
  kodeMk,
  namaMk,
  activeOffering,
  history,
  saveAction,
  deleteAction,
  reloadAction,
}: {
  courseId: string;
  kodeMk: string;
  namaMk: string;
  activeOffering?: {
    id: string;
    label: string;
    capaian: CpmkItem[];
  };
  history: Array<{
    id: string;
    label: string;
    capaian: CpmkItem[];
  }>;
  saveAction: (fd: FormData) => Promise<SaveCpmkResult>;
  deleteAction: (fd: FormData) => Promise<DeleteCpmkResult>;
  reloadAction: (mataKuliahId: string) => Promise<ReloadCpmkResult>;
}) {
  const [items, setItems] = useState(activeOffering?.capaian ?? []);
  const [newIndicator, setNewIndicator] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function saveNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeOffering) return;
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveAction(formData);
      if (!result.ok) {
        setMessage(`Error: ${result.message}`);
        return;
      }
      if ("item" in result) {
        setItems((current) => [...current, result.item]);
        setNewIndicator("");
      }
      setMessage(result.message);
    });
  }

  function beginEdit(item: CpmkItem) {
    setEditingId(item.id);
    setEditingValue(item.indikatorCapaian);
    setMessage("");
  }

  function saveEdit() {
    if (!activeOffering || !editingId) return;
    const formData = new FormData();
    formData.set("id", editingId);
    formData.set("mataKuliahId", courseId);
    formData.set("mataKuliahSemesterId", activeOffering.id);
    formData.set("indikatorCapaian", editingValue);
    startTransition(async () => {
      const result = await saveAction(formData);
      if (!result.ok) {
        setMessage(`Error: ${result.message}`);
        return;
      }
      if ("item" in result) {
        setItems((current) =>
          current.map((item) => (item.id === result.item.id ? result.item : item)),
        );
        setEditingId(null);
        setEditingValue("");
      }
      setMessage(result.message);
    });
  }

  function deleteItem(itemId: string) {
    const formData = new FormData();
    formData.set("id", itemId);
    formData.set("mataKuliahId", courseId);
    startTransition(async () => {
      const result = await deleteAction(formData);
      if (!result.ok) {
        setMessage(`Error: ${result.message}`);
        return;
      }
      if ("id" in result) {
        setItems((current) => current.filter((item) => item.id !== result.id));
        if (editingId === result.id) {
          setEditingId(null);
          setEditingValue("");
        }
      }
      setMessage(result.message);
    });
  }

  async function reloadItems() {
    const result = await reloadAction(courseId);
    if (!result.ok) {
      setMessage(`Error: ${result.message}`);
      return;
    }
    if ("items" in result) setItems(result.items);
  }

  return (
    <FormModal
      modalId={`cpmk-${courseId}`}
      title={`CPMK - ${kodeMk} ${namaMk}`}
      triggerLabel="Kelola CPMK"
      dialogClassName="max-w-5xl"
      triggerClassName="w-full"
    >
      <p className="mb-4 text-sm text-slate-600">
        {activeOffering
          ? `Semester aktif: ${activeOffering.label}`
          : "Mata kuliah ini belum ditawarkan pada semester aktif."}
      </p>

      {activeOffering ? (
        <>
          <form onSubmit={saveNew} className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input type="hidden" name="mataKuliahId" value={courseId} />
            <input
              type="hidden"
              name="mataKuliahSemesterId"
              value={activeOffering.id}
            />
            <textarea
              name="indikatorCapaian"
              className={inputClass}
              rows={3}
              value={newIndicator}
              onChange={(event) => setNewIndicator(event.target.value)}
              placeholder="Contoh: Mahasiswa mampu menganalisis kompleksitas algoritma..."
              required
            />
            <button className={`${buttonClass} h-10 self-start`} disabled={pending}>
              Tambah CPMK
            </button>
          </form>

          <div className="mt-3">
            <CpmkImportForm kodeMk={kodeMk} onImported={reloadItems} />
          </div>

          {message && (
            <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {message}
            </p>
          )}

          <div className="mt-5 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="w-16 p-3">No.</th>
                  <th className="p-3">Indikator capaian</th>
                  <th className="w-32 p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const editing = editingId === item.id;
                  return (
                    <tr key={item.id} className="border-t align-top">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">
                        {editing ? (
                          <textarea
                            className={inputClass}
                            rows={3}
                            value={editingValue}
                            onChange={(event) => setEditingValue(event.target.value)}
                            autoFocus
                          />
                        ) : (
                          item.indikatorCapaian
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                                onClick={saveEdit}
                                disabled={pending}
                                aria-label="Simpan perubahan CPMK"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingValue("");
                                }}
                                disabled={pending}
                                aria-label="Batal edit CPMK"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => beginEdit(item)}
                                aria-label="Edit CPMK"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                                onClick={() => deleteItem(item.id)}
                                disabled={pending}
                                aria-label="Hapus CPMK"
                              >
                                <Trash2 size={17} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!items.length && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-sm text-slate-400">
                      Belum ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="mb-5 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Tambahkan semester aktif ke penawaran mata kuliah sebelum mengisi CPMK.
        </p>
      )}

      {history.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 font-semibold">Riwayat CPMK semester lain</h3>
          {history.map((offering) => (
            <div key={offering.id} className="mb-3 rounded-md border p-3">
              <div className="mb-1 text-sm font-semibold">{offering.label}</div>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {offering.capaian.map((item) => (
                  <li key={item.id}>{item.indikatorCapaian}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </FormModal>
  );
}
