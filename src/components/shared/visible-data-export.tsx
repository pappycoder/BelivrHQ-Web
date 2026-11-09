"use client";
import { useRef, useState } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import { useExportBranding } from "@/hooks/use-export-branding";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { getToastErrorMessage, toast } from "@/lib/toast";
export function VisibleDataExport({
  getRoot,
  includeTables = true,
  selectedOnly = false,
  label = "Export",
}: {
  getRoot?: () => Element | null;
  includeTables?: boolean;
  selectedOnly?: boolean;
  label?: string;
}) {
  const exportRoot = useRef<HTMLDivElement>(null);
  const { ready } = usePermissions();
  const resolveBranding = useExportBranding();
  const [busy, setBusy] = useState(false);
  async function download(format: "csv" | "xlsx" | "pdf") {
    if (!ready || busy) return;
    setBusy(true);
    try {
      const root = getRoot ? getRoot() : exportRoot.current?.closest("[data-collection]");
      const { collectVisibleData } = await import("@/lib/visible-data-export");
      const sections = root ? collectVisibleData(root, { includeTables, selectedOnly }) : [];
      if (!sections.length) {
        toast.info("No visible table rows or list items to export");
        return;
      }
      const exports = await import("@/lib/export-utils");
      const branding = await resolveBranding();
      const filename = "belivrhq-export";
      if (format === "pdf") {
        const doc = await exports.createReportPDF("Export", sections, { branding });
        doc.save(`${filename}.pdf`);
      } else if (format === "xlsx") {
        await exports.exportExcel(
          sections.map((section, i) => ({
            name: `${i + 1} ${section.title}`.slice(0, 31),
            columns: section.columns,
            data: section.data,
          })),
          filename,
          { branding },
        );
      } else {
        const data = sections.flatMap((section) =>
          section.data.map((record, i) => ({
            section: section.title,
            row: i + 1,
            ...Object.fromEntries(
              section.columns.map((column) => [column.label, record[column.key]]),
            ),
          })),
        );
        const labels = [
          ...new Set(sections.flatMap((section) => section.columns.map((column) => column.label))),
        ];
        exports.exportCSV(
          data,
          [
            { key: "section", label: "Collection" },
            { key: "row", label: "Row" },
            ...labels.map((label) => ({ key: label, label })),
          ],
          filename,
          branding,
        );
      }
    } catch (error) {
      toast.error("Export failed", {
        description: getToastErrorMessage(error, "Please try again."),
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div ref={exportRoot} className="flex justify-end" data-export-ignore>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label={label}
            disabled={!ready || busy}
            title={label}
          >
            <Download className="size-4" />
            {busy ? "Exporting…" : label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => void download("csv")}>Export as CSV</DropdownMenuItem>
          <DropdownMenuItem onClick={() => void download("xlsx")}>Export as Excel</DropdownMenuItem>
          <DropdownMenuItem onClick={() => void download("pdf")}>Export as PDF</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
