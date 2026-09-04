import { readSession } from "@/lib/session";
import {
  makeTemplate,
  TEMPLATE_HEADERS,
  type TemplateName,
  workbookResponse,
} from "@/lib/excel/workbook";

export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const session = await readSession();
  if (!session || !["Admin", "AdminJurusan"].includes(session.role))
    return Response.json({ message: "Tidak memiliki akses." }, { status: 403 });
  const { name } = await context.params;
  if (!(name in TEMPLATE_HEADERS))
    return Response.json(
      { message: "Template tidak ditemukan." },
      { status: 404 },
    );
  const templateName = name as TemplateName;
  const workbook = makeTemplate(templateName);
  const kodeMk = new URL(request.url).searchParams.get("kode_mk")?.trim();
  if (templateName === "cpmk" && kodeMk)
    workbook.worksheets[0].addRow([kodeMk, ""]);
  return workbookResponse(
    workbook,
    kodeMk && templateName === "cpmk"
      ? `template_cpmk_${kodeMk.replaceAll(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`
      : `template_${name}.xlsx`,
  );
}
