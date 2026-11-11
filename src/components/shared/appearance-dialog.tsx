"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const modes = [
  { value: "light", title: "Light", icon: Sun },
  { value: "dark", title: "Dark", icon: Moon },
  { value: "system", title: "System", icon: Monitor },
] as const;

export function AppearanceDialog({ open, onOpenChange, returnFocusRef }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { theme, setTheme } = useTheme();
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md" onCloseAutoFocus={event => { event.preventDefault(); returnFocusRef.current?.focus(); }}>
      <DialogHeader>
        <DialogTitle>Appearance</DialogTitle>
        <DialogDescription>Choose the light that works for you. System follows your device’s appearance.</DialogDescription>
      </DialogHeader>
      <div role="group" aria-label="Colour mode" className="grid grid-cols-3 gap-3 py-3">
        {modes.map(({ value, title, icon: Icon }) => <button key={value} type="button" aria-pressed={theme === value}
          onClick={() => setTheme(value)} className="workspace-mode-choice flex flex-col items-center gap-3 rounded-xl border p-5 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/5 aria-pressed:text-primary">
          <Icon className="size-6" aria-hidden="true" />{title}
        </button>)}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">A consistent teal palette connects every part of your workspace.</p>
      <DialogFooter><Button onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
