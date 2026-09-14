import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const isStandaloneDisplay = () =>
  window.matchMedia?.("(display-mode: standalone)")?.matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const getDeviceInfo = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|chrome|android/.test(userAgent);
  const hostname = window.location.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

  return {
    isIos,
    isAndroid,
    isSafari,
    isLocalhost,
    isSecureContext: window.isSecureContext || isLocalhost,
  };
};

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    isIos: false,
    isAndroid: false,
    isSafari: false,
    isLocalhost: false,
    isSecureContext: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsInstalled(isStandaloneDisplay());
    setDeviceInfo(getDeviceInfo());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return "unavailable" as const;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome;
  };

  return {
    canInstall: !!deferredPrompt,
    isInstalled,
    isIos: deviceInfo.isIos,
    isAndroid: deviceInfo.isAndroid,
    isSafari: deviceInfo.isSafari,
    isSecureContext: deviceInfo.isSecureContext,
    promptInstall,
  };
}
