import { readSession } from "@/lib/session";
import { importRows, readImportRows } from "@/lib/excel/import";
import { TEMPLATE_HEADERS, type TemplateName } from "@/lib/excel/workbook";

export async function POST(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const session = await readSession();
  if (!session || !["Admin", "AdminJurusan"].includes(session.role))
    return Response.json({ message: "Tidak memiliki akses." }, { status: 403 });
  const { name } = await context.params;
  if (!(name in TEMPLATE_HEADERS))
    return Response.json(
      { message: "Jenis import tidak dikenal." },
      { status: 404 },
    );
  const data = await request.formData(),
    file = data.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx"))
    return Response.json(
      { message: "Pilih file .xlsx yang sesuai template." },
      { status: 422 },
    );
  if (file.size > 10 * 1024 * 1024)
    return Response.json(
      { message: "Ukuran file maksimal 10 MB." },
      { status: 413 },
    );

  try {
    const rows = await readImportRows(file, name as TemplateName);
    const selected = String(data.get("jurusan_id") ?? "");
    const result = await importRows(
      name as TemplateName,
      rows,
      {
        role: session.role as "Admin" | "AdminJurusan",
        jurusanId: session.jurusanId ? BigInt(session.jurusanId) : null,
      },
      /^\d+$/.test(selected) ? BigInt(selected) : undefined,
    );
    return Response.json(result, { status: result.failed ? 207 : 200 });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Import gagal." },
      { status: 422 },
    );
  }
}
