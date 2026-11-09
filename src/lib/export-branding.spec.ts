import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { createExcelWorkbook, createReportPDF, exportCSV } from "./export-utils";
import { loadExportLogo } from "./export-branding";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("church-branded exports", () => {
  const sheets = [{ name: "Members", columns: [{ key: "name", label: "Member" }], data: [{ name: "Ada" }] }];

  it("keeps tenant identities separate and retains BelivrHQ in saved workbooks", async () => {
    const first = await createExcelWorkbook(sheets, { branding: { churchName: "Grace Church" } });
    const second = await createExcelWorkbook(sheets, { branding: { churchName: "Hope Church" } });
    expect(first.worksheets[0].getCell("A1").value).toContain("Grace Church");
    expect(second.worksheets[0].getCell("A1").value).toContain("Hope Church");
    expect(second.worksheets[0].getCell("A3").value).toContain("Powered by BelivrHQ");
    expect(first.creator).toBe("BelivrHQ");
    const { Workbook } = await import("exceljs");
    const restored = new Workbook();
    await restored.xlsx.load(await first.xlsx.writeBuffer());
    expect(restored.company).toBe("Grace Church");
    expect(restored.worksheets[0].getCell("A7").value).toBe("Ada");
  });

  it("does not prepend branding to machine-readable import templates", async () => {
    const book = await createExcelWorkbook([{ ...sheets[0], template: true }], { branding: { churchName: "Grace Church", logoUrl: "https://example.com/logo.png" } });
    expect(book.worksheets[0].getCell("A1").value).toBe("Member");
    expect(book.worksheets[0].getCell("A2").value).toBe("Ada");
    expect(book.worksheets[0].getImages()).toHaveLength(0);
  });

  it("brands every PDF page while retaining the complete church name in document metadata", async () => {
    vi.stubGlobal("fetch", async (url: string) => new Response(await readFile(`public${url}`)));
    const name = "Grace Community Church and Ministry Network";
    const doc = await createReportPDF("Members", [{ title: "Members", columns: sheets[0].columns, data: Array.from({ length: 100 }, (_, i) => ({ name: `Member ${i}` })) }], { branding: { churchName: name } });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    const pdf = doc.output();
    expect(pdf).toContain(`/Author (${name})`);
    expect(pdf).toContain("/Creator (BelivrHQ)");
    // The encoded church heading and app footer appear on every generated page.
    const pages = (doc.internal as unknown as { pages: string[][] }).pages.slice(1);
    expect(pages.every((page) => page.some((line) => line.includes("Tj")))).toBe(true);
  });

  it("adds CSV identity without shifting the original columns and still neutralises spreadsheet formulas", async () => {
    let output: Blob | undefined;
    let filename = "";
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => { output = blob as Blob; return "blob:export"; });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.stubGlobal("document", { createElement: () => ({ set download(value: string) { filename = value; }, click() {} }) });
    exportCSV([{ name: "=SUM(1,2)" }], sheets[0].columns, "members", { churchName: "=Unsafe, Church" });
    const csv = await output!.text();
    expect(csv.split("\n")[0]).toBe("Member,Church,Exported with");
    expect(csv).toContain('"\'=SUM(1,2)"');
    expect(csv).toContain('"\'=Unsafe, Church",BelivrHQ');
    expect(filename).toContain("Unsafe-Church-members-belivrhq.csv");
  });

  it("ignores failed, oversized and unsupported logos without failing the export", async () => {
    vi.stubGlobal("window", { location: { origin: "https://church.example" } });
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("CORS"))
      .mockResolvedValueOnce(new Response("large", { headers: { "content-length": "3000000", "content-type": "image/png" } }))
      .mockResolvedValueOnce(new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }));
    vi.stubGlobal("fetch", fetcher);
    for (let i = 0; i < 3; i++) expect(await loadExportLogo({ churchName: "Grace", logoUrl: "https://cdn.example/logo.png" })).toBeUndefined();
    expect(await loadExportLogo({ churchName: "Grace", logoUrl: "javascript:alert(1)" })).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
