import { TemplateEditorPage } from "@/components/knock/template-editor-page";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ template_id: string }>;
}) {
  const { template_id } = await params;
  return <TemplateEditorPage templateId={template_id} />;
}
