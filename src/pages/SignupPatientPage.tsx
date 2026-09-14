import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { SignupShell } from "@/components/site/SignupShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

const patientHighlights = [
  "Profile fields cover the patient record shown inside the dashboard",
  "Major health issues are captured as a comma-separated list for easy review",
  "The account is linked to the patient dashboard immediately after signup",
];

export default function SignupPatientPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Female");
  const [bloodGroup, setBloodGroup] = useState("B+");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [majorHealthIssues, setMajorHealthIssues] = useState("");
  const [allergies, setAllergies] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  const issuesPreview = useMemo(
    () =>
      majorHealthIssues
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [majorHealthIssues],
  );

  const allergyPreview = useMemo(
    () =>
      allergies
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [allergies],
  );

  const medicationPreview = useMemo(
    () =>
      currentMedications
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name = "", dosage = "", frequency = "As directed"] = line.split("|").map((item) => item.trim());
          return {
            name,
            dosage,
            frequency: frequency || "As directed",
          };
        })
        .filter((item) => item.name),
    [currentMedications],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setShowConsentDialog(true);
  };

  const handleConsentAndRegister = async () => {
    setError(null);
    setLoading(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role: "patient",
        age: Number(age) || 0,
        gender,
        bloodGroup,
        contactNumber: contact.trim(),
        address: address.trim(),
        majorIssues: issuesPreview,
        allergies: allergyPreview,
        currentMedications: medicationPreview,
        consentAccepted: true,
      });

      setShowConsentDialog(false);
      navigate("/patient/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignupShell
      eyebrow="Patient Signup"
      title="Register a patient profile with the core medical details"
      description="This form captures the information that powers the patient profile, records, and chart summary views."
      highlights={patientHighlights}
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="patient-name">Full name</Label>
            <Input id="patient-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Anaya Joseph" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient-age">Age</Label>
            <Input id="patient-age" type="number" min="0" value={age} onChange={(event) => setAge(event.target.value)} placeholder="34" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient-gender">Gender</Label>
            <Input id="patient-gender" value={gender} onChange={(event) => setGender(event.target.value)} placeholder="Female" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient-blood-group">Blood group</Label>
            <Input id="patient-blood-group" value={bloodGroup} onChange={(event) => setBloodGroup(event.target.value)} placeholder="B+" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient-contact">Contact number</Label>
            <Input id="patient-contact" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="+91 98765 43210" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient-email">Email</Label>
            <Input id="patient-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="patient@example.com" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient-password">Password</Label>
            <Input id="patient-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required minLength={6} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="patient-address">Address</Label>
          <Textarea id="patient-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="House, street, city, state" className="min-h-28 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="patient-health-issues">Major health issues</Label>
          <Textarea
            id="patient-health-issues"
            value={majorHealthIssues}
            onChange={(event) => setMajorHealthIssues(event.target.value)}
            placeholder="Type 2 Diabetes, Hypertension, Seasonal Asthma"
            className="min-h-28 rounded-2xl border-white/70 bg-background/70 dark:border-white/10"
          />
          <p className="text-xs text-muted-foreground">Use commas to separate conditions. This will appear as the patient&apos;s tracked health issues.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="patient-allergies">Drug allergies</Label>
          <Textarea
            id="patient-allergies"
            value={allergies}
            onChange={(event) => setAllergies(event.target.value)}
            placeholder="Penicillin, Ibuprofen, Sulfa drugs"
            className="min-h-24 rounded-2xl border-white/70 bg-background/70 dark:border-white/10"
          />
          <p className="text-xs text-muted-foreground">Use commas to separate allergies so doctors can be warned before prescribing.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="patient-current-meds">Current medications</Label>
          <Textarea
            id="patient-current-meds"
            value={currentMedications}
            onChange={(event) => setCurrentMedications(event.target.value)}
            placeholder={"Metformin | 500 mg | Twice daily\nAspirin | 75 mg | Once daily"}
            className="min-h-28 rounded-2xl border-white/70 bg-background/70 dark:border-white/10"
          />
          <p className="text-xs text-muted-foreground">Enter one medicine per line using Name | Dosage | Frequency.</p>
        </div>

        <div className="rounded-[1.75rem] border border-white/70 bg-background/70 p-4 dark:border-white/10">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Preview</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {issuesPreview.length ? (
              issuesPreview.map((issue) => (
                <span key={issue} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {issue}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No health issues added yet.</span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {allergyPreview.length ? (
              allergyPreview.map((allergy) => (
                <span key={allergy} className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300">
                  Allergy: {allergy}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No allergies added yet.</span>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {medicationPreview.length ? (
              medicationPreview.map((item) => (
                <div key={`${item.name}-${item.dosage}-${item.frequency}`} className="rounded-2xl bg-white/70 px-4 py-3 text-sm dark:bg-slate-900/50">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground"> {item.dosage ? `| ${item.dosage}` : ""} | {item.frequency}</span>
                </div>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No current medications added yet.</span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl text-sm font-semibold">
          {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Create patient account"}
        </Button>
      </form>

      <Dialog open={showConsentDialog} onOpenChange={(open) => !loading && setShowConsentDialog(open)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Patient Data Privacy & Consent</DialogTitle>
            <DialogDescription>
              Please review and accept before creating your account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Your medical data will be securely stored in this system.</p>
            <p>Your data will only be shared with doctors when you provide access (QR or appointment).</p>
            <p>Access to your data is temporary and controlled.</p>
            <p>Doctors cannot download or misuse your data.</p>
            <p>Your data is private and protected.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleConsentAndRegister} disabled={loading} className="rounded-2xl">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </span>
              ) : (
                "I Agree and Continue"
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowConsentDialog(false)} disabled={loading} className="rounded-2xl">
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SignupShell>
  );
}
