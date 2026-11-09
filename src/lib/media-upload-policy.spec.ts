import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { runInNewContext } from "node:vm";
import { MEDIA_UPLOAD_PERMISSIONS, mediaUploadPermissions } from "./media-upload-policy";

describe("media upload permission contract", () => {
  const backend = path.resolve(process.cwd(), "../BelivrHQ-Backend/src/media/media-upload-policy.ts");
  it.skipIf(!fs.existsSync(backend))("keeps exact upload purpose grants identical to the backend", () => {
    const source = ts.createSourceFile(backend, fs.readFileSync(backend, "utf8"), ts.ScriptTarget.Latest, true);
    let expression: string | undefined;
    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && node.name.getText() === "MEDIA_UPLOAD_PERMISSIONS") expression = node.initializer?.getText();
      ts.forEachChild(node, visit);
    };
    visit(source);
    expect(expression).toBeDefined();
    expect(JSON.parse(JSON.stringify(runInNewContext(`(${expression})`, {}, { timeout: 1000 })))).toEqual(MEDIA_UPLOAD_PERMISSIONS);
  });
  it("uses the general upload permission for unknown or inherited folder keys", () => {
    for (const folder of ["documents", "__proto__", "constructor", "toString"]) expect(mediaUploadPermissions(folder)).toEqual(["media:upload:create"]);
  });
  it("allows asset editing and form-response attachments without library publishing", () => {
    expect(mediaUploadPermissions("assets")).toContain("assets:list:update");
    expect(mediaUploadPermissions("form-attachments")).toContain("forms:list:read");
    expect(mediaUploadPermissions("assets")).not.toContain("assets:list:read");
  });
});
