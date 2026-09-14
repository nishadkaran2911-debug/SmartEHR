import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { SignupShell } from "@/components/site/SignupShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const doctorHighlights = [
  "Licence number is required to verify the doctor identity",
  "NPI is checked against the official NPI Registry before account creation",
  "Professional details align with the doctor profile page and dashboard",
  "The form is ready for on-boarding new clinicians into the demo",
];

export default function SignupDoctorPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [contact, setContact] = useState("");
  const [qualification, setQualification] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experience, setExperience] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [npiNumber, setNpiNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setVerificationMessage(null);

    const normalizedNpi = npiNumber.trim();
    if (!/^\d{10}$/.test(normalizedNpi)) {
      setError("NPI Number must be exactly 10 digits.");
      return;
    }

    setLoading(true);
    setVerificationMessage("Verifying NPI with registry...");

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role: "doctor",
        age: Number(age) || 0,
        contactNumber: contact.trim(),
        qualification: qualification.trim(),
        specialization: specialization.trim(),
        experience: Number(experience) || 0,
        licenseNumber: licenseNumber.trim(),
        npiNumber: normalizedNpi,
        hospitalName: "Smart EHR Hospital", // Default for demo
      });

      setVerificationMessage("NPI verified successfully");
      toast.success("NPI verified successfully");
      navigate("/doctor/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
      setVerificationMessage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SignupShell
      eyebrow="Doctor Signup"
      title="Register a doctor profile with licence and practice details"
      description="This page collects the clinician information the app needs for identity, verification, and profile display."
      highlights={doctorHighlights}
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doctor-name">Full name</Label>
            <Input id="doctor-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Dr. Neha Rao" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-age">Age</Label>
            <Input id="doctor-age" type="number" min="0" value={age} onChange={(event) => setAge(event.target.value)} placeholder="42" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-email">Email</Label>
            <Input id="doctor-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="doctor@hospital.org" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-password">Password</Label>
            <Input id="doctor-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-contact">Contact number</Label>
            <Input id="doctor-contact" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="+91 90000 00000" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-qualification">Qualification</Label>
            <Input id="doctor-qualification" value={qualification} onChange={(event) => setQualification(event.target.value)} placeholder="MD Internal Medicine" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="doctor-specialization">Specialization</Label>
            <Input id="doctor-specialization" value={specialization} onChange={(event) => setSpecialization(event.target.value)} placeholder="Cardio-metabolic Care" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-experience">Experience (Years)</Label>
            <Input id="doctor-experience" type="number" min="0" value={experience} onChange={(event) => setExperience(event.target.value)} placeholder="14" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-license">Licence number</Label>
            <Input id="doctor-license" value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} placeholder="LIC-2026-001" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doctor-npi">NPI Number</Label>
            <Input
              id="doctor-npi"
              value={npiNumber}
              onChange={(event) => setNpiNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="1234567890"
              className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10"
              required
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
            />
          </div>
        </div>

        {verificationMessage && (
          <div className={`p-3 rounded-xl text-sm font-semibold border ${loading
            ? "bg-primary/10 text-primary border-primary/20"
            : "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-300"
            }`}>
            {verificationMessage}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl text-sm font-semibold">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying NPI...
            </span>
          ) : (
            "Create doctor account"
          )}
        </Button>
      </form>
    </SignupShell>
  );
}
