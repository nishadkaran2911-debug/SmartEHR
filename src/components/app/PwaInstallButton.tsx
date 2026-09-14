import { useState } from "react";
import { Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { toast } from "@/components/ui/sonner";

type PwaInstallButtonProps = {
  className?: string;
  mobileMenuClose?: () => void;
};

export function PwaInstallButton({ className, mobileMenuClose }: PwaInstallButtonProps) {
  const { canInstall, isInstalled, isIos, isSafari, isSecureContext, promptInstall } = usePwaInstall();
  const [showHelp, setShowHelp] = useState(false);

  if (isInstalled) {
    return null;
  }

  const openInstallHelp = () => {
    mobileMenuClose?.();
    setShowHelp(true);
  };

  const handleClick = async () => {
    mobileMenuClose?.();

    if (canInstall) {
      const outcome = await promptInstall();

      if (outcome === "accepted") {
        toast.success("App install started");
        return;
      }

      if (outcome === "dismissed") {
        toast("Install prompt dismissed");
        return;
      }
    }

    openInstallHelp();
  };

  const title = canInstall ? "Install App" : "Add to Home Screen";
  const helpDescription = !isSecureContext
    ? "This app must be opened on HTTPS or localhost before the browser will allow installation."
    : isIos && isSafari
      ? "Safari on iPhone and iPad does not show the normal install popup, so use the Share menu steps below."
      : "Your browser is not showing the automatic install popup, so use the browser menu steps below.";

  return (
    <>
      <Button variant="outline" className={className} onClick={() => void handleClick()}>
        <Download className="h-4 w-4" />
        {title}
      </Button>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{helpDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-foreground">
            {!isSecureContext && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-amber-800 dark:text-amber-300">
                Open this app from a secure URL first. On mobile, a plain `http://` LAN address will not install as a PWA.
              </div>
            )}

            {isIos && isSafari ? (
              <>
                <div className="rounded-2xl border bg-background/60 p-4">
                  <p className="font-medium">1. Tap the Share button in Safari.</p>
                  <p className="mt-1 text-muted-foreground">Look for the square with the upward arrow.</p>
                </div>
                <div className="rounded-2xl border bg-background/60 p-4">
                  <p className="font-medium">2. Scroll and tap Add to Home Screen.</p>
                  <p className="mt-1 text-muted-foreground">If you do not see it, scroll further down in the share sheet.</p>
                </div>
                <div className="rounded-2xl border bg-background/60 p-4">
                  <p className="font-medium">3. Tap Add to finish.</p>
                  <p className="mt-1 text-muted-foreground">After that, launch Smart EHR from your home screen like an installed app.</p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl border bg-background/60 p-4">
                  <p className="font-medium">1. Open the browser menu.</p>
                  <p className="mt-1 text-muted-foreground">Use the three-dot menu or browser options button.</p>
                </div>
                <div className="rounded-2xl border bg-background/60 p-4">
                  <p className="font-medium">2. Tap Install app or Add to Home Screen.</p>
                  <p className="mt-1 text-muted-foreground">The wording depends on the browser and device.</p>
                </div>
                <div className="rounded-2xl border bg-background/60 p-4">
                  <p className="font-medium">3. Confirm the install.</p>
                  <p className="mt-1 text-muted-foreground">If the option is missing, reload once after the service worker finishes registering.</p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            {isIos && isSafari ? (
              <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
                <Share className="h-4 w-4" />
                Safari requires the Share menu for installation.
              </div>
            ) : (
              <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
                <Smartphone className="h-4 w-4" />
                Installation works best in Chrome, Edge, or Safari with a secure URL.
              </div>
            )}
            <Button className="rounded-2xl" onClick={() => setShowHelp(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
