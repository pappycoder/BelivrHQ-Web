"use client";

import * as React from "react";
import { Download, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/** One-time display used by both enrollment and sign-in migration. */
export function RecoveryCodesPanel({ codes, onDone }: { codes: string[]; onDone: () => void | Promise<void> }) {
  const [saved, setSaved] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);
  const finish = async () => {
    setFinishing(true);
    try { await onDone(); } finally { setFinishing(false); }
  };
  const checkboxId = React.useId();
  const download = () => {
    const blob = new Blob([`BelivrHQ recovery codes\nKeep these private. Each code works only once.\n\n${codes.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "belivrhq-recovery-codes.txt";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section aria-label="Recovery codes" className="space-y-4 rounded-2xl border bg-muted/30 p-4 sm:p-5">
      <div className="flex items-center gap-2 font-medium"><ShieldCheck className="size-5 text-primary" />Save your recovery codes</div>
      <p className="text-sm text-muted-foreground">Each code can sign you in once if you lose your authenticator. These codes will not be shown again. Save them in a password manager or another secure place.</p>
      <div className="grid gap-2 sm:grid-cols-2">{codes.map(code => <code key={code} className="select-all break-all rounded-lg border bg-background p-2 font-mono text-sm">{code}</code>)}</div>
      <Button type="button" variant="outline" onClick={download}><Download />Download codes</Button>
      <div className="flex items-start gap-2"><Checkbox id={checkboxId} checked={saved} onCheckedChange={value => setSaved(value === true)} /><Label htmlFor={checkboxId} className="leading-5">I have saved these codes securely.</Label></div>
      <Button type="button" disabled={!saved || finishing} loading={finishing} onClick={() => void finish()}>Continue</Button>
    </section>
  );
}
