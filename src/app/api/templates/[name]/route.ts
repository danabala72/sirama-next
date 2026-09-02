import { readSession } from "@/lib/session";
import { makeTemplate, TEMPLATE_HEADERS, type TemplateName, workbookResponse } from "@/lib/excel/workbook";

export async function GET(_request: Request, context: { params: Promise<{ name: string }> }) {
  const session = await readSession();
  if (!session || !["Admin", "AdminJurusan"].includes(session.role)) return Response.json({ message: "Tidak memiliki akses." }, { status: 403 });
  const { name } = await context.params;
  if (!(name in TEMPLATE_HEADERS)) return Response.json({ message: "Template tidak ditemukan." }, { status: 404 });
  return workbookResponse(makeTemplate(name as TemplateName), `template_${name}.xlsx`);
}
