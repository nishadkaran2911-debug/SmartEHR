import { useEffect, useRef, useState } from "react";
import { ExternalLink, QrCode, Sparkles, UserRound } from "lucide-react";
import jsQR from "jsqr";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, toApiAssetUrl } from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import { buildDoctorPatientRecord } from "@/lib/doctorPatientRecord";
import { clearCachedPatientChart, readCachedPatientChart, saveCachedPatientChart } from "@/lib/offlineStore";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  PrescriptionSafetyDialog,
  type PrescriptionSafetyAlert,
} from "@/components/app/PrescriptionSafetyDialog";

export default function DoctorScanPage() {
  const { doctorAccess, grantDoctorAccess, clearDoctorAccess } = useAuth();
  const isOnline = useOnlineStatus();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [scannedPatient, setScannedPatient] = useState<any | null>(null);
  const [medicine, setMedicine] = useState("");
  const [dosage, setDosage] = useState("");
  const [duration, setDuration] = useState("");
  const [testName, setTestName] = useState("");
  const [testNotes, setTestNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [savedFor, setSavedFor] = useState("");
  const [testSavedFor, setTestSavedFor] = useState("");
  const [duplicateTestMatch, setDuplicateTestMatch] = useState<any | null>(null);
  const [safetyAlerts, setSafetyAlerts] = useState<PrescriptionSafetyAlert[]>([]);
  const [safetyDialogOpen, setSafetyDialogOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scanningRef = useRef(false);
  const detectedTokenRef = useRef("");
  const detectedRepeatCountRef = useRef(0);

  const stopScanning = () => {
    scanningRef.current = false;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const stopCamera = () => {
    stopScanning();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  const loadPatientData = async (patientId: string) => {
      const [profile, historyRes, presRes, summaryRes] = await Promise.all([
        apiFetch(`/doctors/patient/${patientId}/profile`),
        apiFetch(`/doctors/patient/${patientId}/history`),
        apiFetch(`/doctors/patient/${patientId}/prescriptions`),
        apiFetch(`/doctors/patient/${patientId}/summary`)
      ]);

      const formattedPatient = buildDoctorPatientRecord(profile, historyRes, presRes, summaryRes);

      setScannedPatient(formattedPatient);
      saveCachedPatientChart(formattedPatient);
      setSavedFor("");
      setTestSavedFor("");
      setDuplicateTestMatch(null);
      setMessage(`Verified QR for ${formattedPatient.name}. Patient details are ready below.`);
  };

  const handleScan = async (value: string) => {
    if (!value) return;
    if (!isOnline) {
      setMessage("You are offline. Open the cached patient chart if it was synced on this device earlier.");
      return;
    }
    try {
      const res: any = await apiFetch('/doctors/verify-patient', {
        method: 'POST',
        body: JSON.stringify({ qrCode: value.trim() })
      });
      grantDoctorAccess(res.patientId);
      await loadPatientData(res.patientId);
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "No patient matched that QR token.");
      clearDoctorAccess();
      setScannedPatient(null);
    }
  };

  const handleCameraDetected = (value: string) => {
    handleScan(value);
    stopScanning();
  };

  const startCamera = async () => {
    if (!isOnline) {
      setMessage("You are offline. Camera verification needs the internet, but the cached chart can still be opened.");
      return;
    }

    setMessage("");
    setCameraError("");
    setCameraSupported(true);
    setScannedPatient(null);
    setSavedFor("");
    setTestSavedFor("");
    setDuplicateTestMatch(null);
    detectedTokenRef.current = "";
    detectedRepeatCountRef.current = 0;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraSupported(false);
      setCameraError("This browser does not support camera access.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;
      scanningRef.current = true;
      setCameraActive(true);

      setTimeout(async () => {
        const video = videoRef.current;
        if (!video) {
          stopCamera();
          return;
        }

        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (!context) {
          stopCamera();
          setCameraError("This browser cannot prepare the QR scanning canvas.");
          return;
        }

        const scanLoop = async () => {
          if (!scanningRef.current || !videoRef.current) {
            return;
          }

          try {
            const currentVideo = videoRef.current;
            const width = currentVideo.videoWidth;
            const height = currentVideo.videoHeight;

            if (!width || !height) {
              rafRef.current = window.requestAnimationFrame(scanLoop);
              return;
            }

            canvas.width = width;
            canvas.height = height;
            context.drawImage(currentVideo, 0, 0, width, height);

            const imageData = context.getImageData(0, 0, width, height);
            const code = jsQR(imageData.data, width, height)?.data?.trim();

            if (!code || code.length < 5) {
              detectedTokenRef.current = "";
              detectedRepeatCountRef.current = 0;
              rafRef.current = window.requestAnimationFrame(scanLoop);
              return;
            }

            if (detectedTokenRef.current === code) {
              detectedRepeatCountRef.current += 1;
            } else {
              detectedTokenRef.current = code;
              detectedRepeatCountRef.current = 1;
            }

            if (detectedRepeatCountRef.current >= 2) {
              handleCameraDetected(code);
              return;
            }
          } catch {
            // Keep scanning
          }

          rafRef.current = window.requestAnimationFrame(scanLoop);
        };

        rafRef.current = window.requestAnimationFrame(scanLoop);
      }, 300);
    } catch (error) {
      stopCamera();
      setCameraError(error instanceof Error ? error.message : "Unable to access the camera.");
    }
  };

  useEffect(() => {
    if (doctorAccess.patientId) {
      const cachedChart = readCachedPatientChart(doctorAccess.patientId);

      if (cachedChart) {
        setScannedPatient(cachedChart.data);
        setMessage((currentMessage) =>
          currentMessage ||
          (isOnline
            ? `Last synced chart for ${cachedChart.data.name} is available below.`
            : `Offline mode: showing the last synced chart for ${cachedChart.data.name}.`),
        );
      }
    }
  }, [doctorAccess.patientId, isOnline]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const savePrescription = async (override = false) => {
    if (!scannedPatient) return;
    if (!medicine || !dosage || !duration) {
      setMessage("Please fill medicine name, dosage, and duration before saving.");
      return;
    }

    try {
      await apiFetch(`/doctors/patient/${scannedPatient.id}/prescription`, {
        method: 'POST',
        body: JSON.stringify({
           medicines: [{ name: medicine, dosage, duration }],
           notes: notes + (testName ? ` | Test: ${testName}` : ""),
           override,
           overrideReason
        })
      });

      await loadPatientData(scannedPatient.id);
      setSafetyAlerts([]);
      setSafetyDialogOpen(false);
      setOverrideReason("");
      setSavedFor(scannedPatient.name);
      setMessage(`Prescription saved for ${scannedPatient.name}.`);
      setMedicine(""); setDosage(""); setDuration(""); setNotes("");
    } catch (err: any) {
      if (err.status === 400 && err.data?.requiresOverride && err.data?.alerts) {
        setSafetyAlerts(err.data.alerts);
        setSafetyDialogOpen(true);
      } else {
         setMessage("Failed to save prescription: " + err.message);
      }
    }
  };

  const runPrescriptionSafetyCheck = async () => {
    if (!scannedPatient) return;
    if (!medicine || !dosage || !duration) {
      setMessage("Please fill medicine name, dosage, and duration before saving.");
      return;
    }

    try {
      const response: any = await apiFetch(`/doctors/patient/${scannedPatient.id}/prescription-safety-check`, {
        method: "POST",
        body: JSON.stringify({
          medicines: [{ name: medicine, dosage, duration }],
          notes: notes + (testName ? ` | Test: ${testName}` : "")
        })
      });

      if (response.alerts?.length) {
        setSafetyAlerts(response.alerts);
        setSafetyDialogOpen(true);
        return;
      }

      await savePrescription(false);
    } catch (err: any) {
      const routeUnavailable =
        err.status === 404 ||
        String(err.message || "").includes("Cannot POST /api/doctors/patient/") ||
        String(err.data?.message || "").includes("Cannot POST /api/doctors/patient/");

      if (routeUnavailable) {
        await savePrescription(false);
        return;
      }

      setMessage("Failed to run prescription safety check: " + err.message);
    }
  };

  const requestTest = async () => {
    if (!scannedPatient) return;
    if (!testName.trim()) {
      setMessage("Please enter a test name before requesting it.");
      return;
    }

    try {
      const response: any = await apiFetch(`/doctors/patient/${scannedPatient.id}/request-test`, {
        method: "POST",
        body: JSON.stringify({
          testName: testName.trim(),
          notes: testNotes.trim()
        })
      });

      await loadPatientData(scannedPatient.id);
      setTestSavedFor(scannedPatient.name);
      setDuplicateTestMatch(null);
      setTestName("");
      setTestNotes("");
      toast.success("Test requested", {
        description: `${response.test?.title || response.message} for ${scannedPatient.name}`
      });
    } catch (err: any) {
      if (err.status === 400 && err.data?.warning && err.data?.existingRecord) {
        const existingRecord = err.data.existingRecord;
        const reportUrl = existingRecord.reportFile ? toApiAssetUrl(existingRecord.reportFile) : null;
        setDuplicateTestMatch({
          title: existingRecord.title,
          type: existingRecord.type,
          date: new Date(existingRecord.date).toLocaleDateString(),
          reportUrl,
          reportFileName: existingRecord.reportFileName || "report"
        });

        toast.warning("Test is already done", {
          description: `${existingRecord.title} was already recorded on ${new Date(existingRecord.date).toLocaleDateString()}.`,
          action: reportUrl ? {
            label: "Open report",
            onClick: () => window.open(reportUrl, "_blank", "noopener,noreferrer")
          } : undefined
        });
        return;
      }

      toast.error("Failed to request test", {
        description: err.message || "Please try again."
      });
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr] animate-fade-in">
      <section className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Scan QR</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Scan a patient QR for secure access</h1>

        {!isOnline && (
          <div className="mt-6 rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-foreground">
            QR verification needs the internet, but any previously synced patient chart on this device can still be opened below.
          </div>
        )}
        
        <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/70 bg-background/80 dark:border-white/10">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative min-h-[24rem] border-b border-white/60 bg-slate-950 lg:border-b-0 lg:border-r">
              {cameraActive ? (
                <div className="relative h-full">
                  <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                  <div className="pointer-events-none absolute inset-0">
                    <div className="scan-sweep absolute inset-0" />
                    <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border-2 border-dashed border-white/80" />
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <QrCode className="h-10 w-10 text-primary/40" />
                  <p className="mt-5 text-lg font-semibold">Camera is stopped</p>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between p-6">
               <div className="space-y-4">
                  <Button className="w-full rounded-2xl" onClick={cameraActive ? stopCamera : startCamera} disabled={!cameraActive && !isOnline}>
                    {cameraActive ? "Stop Camera" : "Start Camera Scan"}
                  </Button>
                  {doctorAccess.granted && (
                    <Button asChild variant="secondary" className="w-full rounded-2xl">
                      <Link to="/doctor/patient-view">Open Patient Chart</Link>
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full rounded-2xl" 
                    onClick={() => {
                        const activePatientId = scannedPatient?.id || doctorAccess.patientId;
                        if (activePatientId) {
                          clearCachedPatientChart(activePatientId);
                        }
                        clearDoctorAccess();
                        setScannedPatient(null);
                        setSavedFor("");
                        setMessage("Access cleared.");
                    }}
                  >
                    Reset Access
                  </Button>
               </div>
               <div className="mt-4 rounded-2xl bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground">
                  The camera will detect the patient ID from the QR code and securely load their profile from the backend. Once opened, the patient chart is cached on this device for offline viewing.
               </div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
           <Label>Manual Entry</Label>
           <div className="flex gap-2">
              <Input 
                value={token} 
                onChange={e => setToken(e.target.value)} 
                placeholder="Paste QR token" 
                className="h-12 rounded-2xl bg-background/70"
              />
              <Button onClick={() => handleScan(token)} className="h-12 rounded-2xl px-6" disabled={!isOnline}>Verify</Button>
           </div>
        </div>

        {message && <div className="mt-4 rounded-2xl bg-background/80 p-4 text-sm font-medium">{message}</div>}
      </section>

      <section className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Patient Chart</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          {scannedPatient ? scannedPatient.name : "Waiting for verified scan..."}
        </h2>

        {scannedPatient ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
               {[
                 ["Age", scannedPatient.age],
                 ["Gender", scannedPatient.gender],
                 ["Blood Group", scannedPatient.bloodGroup],
                 ["Contact", scannedPatient.contact]
               ].map(([l, v]) => (
                 <div key={l} className="rounded-2xl border bg-background/50 p-4">
                   <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</p>
                   <p className="mt-1 font-medium">{v}</p>
                 </div>
               ))}
            </div>

            <div className="rounded-2xl border bg-background/50 p-5">
               <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">AI Summary</p>
               </div>
               <p className="mt-4 text-sm leading-7 text-foreground">{scannedPatient.aiSummary}</p>
               <div className="mt-4 flex flex-wrap gap-2">
                  {scannedPatient.aiHighlights?.map((item: string) => (
                    <span key={item} className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-foreground dark:bg-slate-900/40">
                      {item}
                    </span>
                  ))}
               </div>
            </div>

            <div className="rounded-2xl border bg-background/50 p-5">
               <p className="text-xs font-semibold uppercase tracking-widest text-primary">Prescription Tools</p>
               <div className="mt-4 space-y-4">
                  <Input value={medicine} onChange={e => setMedicine(e.target.value)} placeholder="Medicine" className="rounded-xl" />
                  <div className="grid grid-cols-2 gap-3">
                     <Input value={dosage} onChange={e => setDosage(e.target.value)} placeholder="Dosage" className="rounded-xl" />
                     <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duration" className="rounded-xl" />
                  </div>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" className="rounded-xl" />
                  <Button onClick={() => void runPrescriptionSafetyCheck()} className="w-full rounded-2xl h-12">Save Prescription</Button>
                  {safetyAlerts.length > 0 && (
                    <div className="rounded-2xl border border-red-200/80 bg-red-50/80 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                      <p className="font-semibold">
                        {safetyAlerts.some((alert) => alert.severity === "high")
                          ? "Severe Allergy Risk detected"
                          : "Possible Drug Interaction detected"}
                      </p>
                      <p className="mt-2 leading-6">{safetyAlerts[0]?.message}</p>
                    </div>
                  )}
               </div>
            </div>

            <div className="rounded-2xl border bg-background/50 p-5">
               <p className="text-xs font-semibold uppercase tracking-widest text-primary">Request Test</p>
               <div className="mt-4 space-y-4">
                  <Input value={testName} onChange={e => setTestName(e.target.value)} placeholder="Test name" className="rounded-xl" />
                  <Textarea value={testNotes} onChange={e => setTestNotes(e.target.value)} placeholder="Reason or notes for this test request" className="rounded-xl" />
                  <Button onClick={requestTest} className="w-full rounded-2xl h-12">Request Test</Button>
               </div>
               <p className="mt-3 text-xs text-muted-foreground">AI-assisted check compares recent reports and tests from the last 15 days before placing the request.</p>
            </div>

            <div className="rounded-2xl border bg-background/50 p-5">
               <p className="text-xs font-semibold uppercase tracking-widest text-primary">Uploaded Reports</p>
               <div className="mt-4 space-y-3">
                  {scannedPatient.reports.length === 0 && (
                    <p className="text-sm text-muted-foreground">No uploaded reports available yet.</p>
                  )}
                  {scannedPatient.reports.map((report: any, idx: number) => (
                    <a
                      key={`${report.title}-${idx}`}
                      href={report.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-white/60 bg-white/60 px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-950/20"
                    >
                      <div>
                        <div className="font-semibold">{report.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{report.date} • {report.fileName}</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-primary" />
                    </a>
                  ))}
               </div>
            </div>

            {duplicateTestMatch && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Test already done within 15 days</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {duplicateTestMatch.title} was already recorded on {duplicateTestMatch.date} as a {duplicateTestMatch.type}.
                </p>
                {duplicateTestMatch.reportUrl && (
                  <a
                    href={duplicateTestMatch.reportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open {duplicateTestMatch.reportFileName}
                  </a>
                )}
              </div>
            )}

            {savedFor && <div className="p-3 text-center text-sm font-medium text-emerald-600">Prescription saved for {savedFor}</div>}
            {testSavedFor && <div className="p-3 text-center text-sm font-medium text-emerald-600">Test requested for {testSavedFor}</div>}
          </div>
        ) : (
          <div className="mt-12 flex flex-col items-center text-muted-foreground">
             <UserRound className="h-12 w-12 opacity-20" />
             <p className="mt-4 text-sm">Please verify a patient to see their details.</p>
          </div>
        )}
      </section>
      <PrescriptionSafetyDialog
        alerts={safetyAlerts}
        open={safetyDialogOpen}
        overrideReason={overrideReason}
        onOverrideReasonChange={setOverrideReason}
        onCancel={() => setSafetyDialogOpen(false)}
        onProceed={() => void savePrescription(true)}
      />
    </div>
  );
}
