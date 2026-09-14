import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PrescriptionSafetyAlert = {
  severity: "high" | "warning";
  category: "allergy" | "interaction";
  newDrug: string;
  conflictingDrug: string;
  title: string;
  message: string;
  explanation?: string;
};

type PrescriptionSafetyDialogProps = {
  alerts: PrescriptionSafetyAlert[];
  open: boolean;
  overrideReason: string;
  saving?: boolean;
  onOverrideReasonChange: (value: string) => void;
  onCancel: () => void;
  onProceed: () => void;
};

export function PrescriptionSafetyDialog({
  alerts,
  open,
  overrideReason,
  saving = false,
  onOverrideReasonChange,
  onCancel,
  onProceed,
}: PrescriptionSafetyDialogProps) {
  const hasHighAlert = alerts.some((alert) => alert.severity === "high");

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && !nextOpen && onCancel()}>
      <DialogContent className="rounded-[2rem] border-white/70 bg-white/95 p-0 dark:border-white/12 dark:bg-slate-950/95">
        <div className={hasHighAlert ? "bg-red-50/90 dark:bg-red-950/30" : "bg-amber-50/90 dark:bg-amber-950/30"}>
          <DialogHeader className="p-6 pb-5">
            <div className="flex items-center gap-3">
              <div className={hasHighAlert ? "rounded-2xl bg-red-100 p-3 text-red-700 dark:bg-red-500/20 dark:text-red-300" : "rounded-2xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"}>
                {hasHighAlert ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="text-left">
                <DialogTitle>{hasHighAlert ? "Severe Allergy Risk" : "Possible Drug Interaction"}</DialogTitle>
                <DialogDescription className="mt-1">
                  Review the risks below before finalizing this prescription.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-4 p-6 pt-5">
          {alerts.map((alert, index) => (
            <div
              key={`${alert.category}-${alert.newDrug}-${alert.conflictingDrug}-${index}`}
              className={alert.severity === "high"
                ? "rounded-[1.5rem] border border-red-200 bg-red-50/70 p-4 dark:border-red-500/20 dark:bg-red-500/10"
                : "rounded-[1.5rem] border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/10"}
            >
              <div className="flex items-center justify-between gap-3">
                <p className={alert.severity === "high" ? "font-semibold text-red-700 dark:text-red-300" : "font-semibold text-amber-700 dark:text-amber-300"}>
                  {alert.title}
                </p>
                <span className="rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground dark:bg-slate-900/60">
                  {alert.severity === "high" ? "High Alert" : "Warning"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground">{alert.message}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/60">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">New Drug</p>
                  <p className="mt-1 font-medium">{alert.newDrug}</p>
                </div>
                <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/60">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {alert.category === "allergy" ? "Allergy Match" : "Conflicting Drug"}
                  </p>
                  <p className="mt-1 font-medium">{alert.conflictingDrug}</p>
                </div>
              </div>
              {alert.explanation && (
                <p className="mt-3 text-xs leading-6 text-muted-foreground">{alert.explanation}</p>
              )}
            </div>
          ))}

          <div className="rounded-[1.5rem] border border-white/70 bg-background/70 p-4 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Override reason</p>
            <Textarea
              value={overrideReason}
              onChange={(event) => onOverrideReasonChange(event.target.value)}
              placeholder="Optional: document the clinical reason for proceeding despite the warning."
              className="mt-3 min-h-[100px] rounded-2xl border-white/70 bg-white/80 dark:border-white/10 dark:bg-slate-900/70"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-white/70 px-6 py-5 dark:border-white/10">
          <Button variant="outline" className="rounded-2xl" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            className={hasHighAlert ? "rounded-2xl bg-red-600 text-white hover:bg-red-700" : "rounded-2xl bg-amber-500 text-slate-950 hover:bg-amber-400"}
            onClick={onProceed}
            disabled={saving}
          >
            Proceed Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
