import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

type EmergencyContact = {
  _id: string;
  name: string;
  phoneNumber: string;
};

export default function PatientProfilePage() {
  const { session } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submittingContact, setSubmittingContact] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    const profile = await apiFetch("/patients/dashboard");
    setPatient(profile);

    try {
      const contactData = await apiFetch("/patients/emergency-contacts");
      setContacts(contactData as EmergencyContact[]);
    } catch (error: any) {
      setContacts([]);
      toast.error(error.message || "Emergency contacts could not be loaded");
    }
  };

  useEffect(() => {
    if (session?.role === 'patient') {
      loadData()
        .catch((error: any) => {
          toast.error(error.message || "Failed to load profile");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  if (loading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
  if (!patient) return <div className="p-10 text-center">Patient not found</div>;

  const handleAddContact = async () => {
    if (!contactName.trim()) {
      toast.error("Contact name is required");
      return;
    }
    if (!/^\+?[1-9]\d{7,14}$/.test(contactPhone.trim())) {
      toast.error("Enter valid phone number");
      return;
    }

    setSubmittingContact(true);
    try {
      await apiFetch("/patients/emergency-contacts", {
        method: "POST",
        body: JSON.stringify({
          name: contactName.trim(),
          phoneNumber: contactPhone.trim()
        })
      });
      toast.success("Emergency contact added");
      setContactName("");
      setContactPhone("");
      setShowAddContact(false);
      const contactData = await apiFetch("/patients/emergency-contacts");
      setContacts(contactData as EmergencyContact[]);
    } catch (error: any) {
      toast.error(error.message || "Failed to add emergency contact");
    } finally {
      setSubmittingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    setDeletingId(contactId);
    try {
      await apiFetch(`/patients/emergency-contacts/${contactId}`, { method: "DELETE" });
      setContacts((prev) => prev.filter((item) => item._id !== contactId));
      toast.success("Emergency contact removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove contact");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Profile</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{patient.userId?.name}</h1>
          <div className="mt-6 space-y-4">
            {[
              ["Age", String(patient.age)],
              ["Gender", patient.gender],
              ["Blood Group", patient.bloodGroup],
              ["Contact", patient.contactNumber],
              ["Email", patient.userId?.email],
              ["Address", patient.address],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.5rem] border border-white/70 bg-background/75 px-4 py-3 dark:border-white/10">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Major Health Issues</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(!patient.majorIssues || patient.majorIssues.length === 0) && (
              <p className="col-span-2 text-sm text-muted-foreground">No active health issues tracked.</p>
            )}
            {patient.majorIssues?.map((issue: string) => (
              <div key={issue} className="rounded-[1.5rem] border border-white/70 bg-background/75 p-5 dark:border-white/10">
                <p className="font-semibold text-foreground">{issue}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Actively tracked in the medical history and ongoing care plan.</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Emergency Contacts</p>
            <h2 className="mt-1 text-xl font-semibold">Smart SOS Contact List</h2>
          </div>
          <Button className="rounded-2xl" onClick={() => setShowAddContact(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Emergency Contact
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-foreground">
            SOS alerts are now sent by SMS through Fast2SMS. Use a valid 10-digit Indian mobile number for each emergency contact.
          </div>
          {contacts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              No emergency contacts added yet.
            </div>
          )}
          {contacts.map((contact) => (
            <article key={contact._id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-background/75 p-4 dark:border-white/10">
              <div>
                <p className="text-sm font-semibold">{contact.name}</p>
                <p className="text-xs text-muted-foreground">{contact.phoneNumber}</p>
              </div>
              <Button
                variant="outline"
                className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => handleDeleteContact(contact._id)}
                disabled={deletingId === contact._id}
              >
                {deletingId === contact._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </article>
          ))}
        </div>
      </section>

      <Dialog open={showAddContact} onOpenChange={(open) => !submittingContact && setShowAddContact(open)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
            <DialogDescription>Contact will receive SOS alerts through SMS.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emergency-name">Contact Name</Label>
              <Input
                id="emergency-name"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder="Family Member Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency-phone">Phone Number</Label>
              <Input
                id="emergency-phone"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="9876543210"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleAddContact} disabled={submittingContact} className="rounded-2xl">
              {submittingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </Button>
            <Button variant="outline" className="rounded-2xl" onClick={() => setShowAddContact(false)} disabled={submittingContact}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
