import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FONTS, fontStack, type FontRole, type FontSettings } from "../fonts/catalog";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fonts: FontSettings;
  onFontChange: (role: FontRole, id: string) => void;
}

const SECTIONS: { role: FontRole; title: string; hint: string }[] = [
  { role: "mono", title: "Editor font", hint: "Code in the reader." },
  { role: "sans", title: "Interface font", hint: "The reader's text and the app." },
];

/** App settings (docs/DESIGN.md section 4): the editor and interface fonts. */
export function SettingsDialog({ open, onOpenChange, fonts, onFontChange }: SettingsDialogProps) {
  // Load every font while the dialog is open, so each name shows in its own font.
  useEffect(() => {
    if (!open) return;
    for (const font of [...FONTS.mono, ...FONTS.sans]) font.load().catch(() => {});
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Changes apply right away.</DialogDescription>
        </DialogHeader>
        {SECTIONS.map(({ role, title, hint }) => (
          <section key={role} aria-labelledby={`font-${role}-title`} className="grid gap-2">
            <div>
              <h3 id={`font-${role}-title`} className="text-sm font-medium">
                {title}
              </h3>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={1}
              aria-labelledby={`font-${role}-title`}
              value={fonts[role]}
              onValueChange={(id) => id && onFontChange(role, id)}
              className="grid w-full grid-cols-2"
            >
              {FONTS[role].map((font) => (
                <ToggleGroupItem
                  key={font.id}
                  value={font.id}
                  className="justify-start"
                  style={{ fontFamily: fontStack(role, font) }}
                >
                  {font.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  );
}
