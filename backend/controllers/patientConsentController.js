import Patient from '../models/Patient.js';

const buildDefaultPatientProfile = (patientAuthId) => ({
  patientAuthId,
  age: 0,
  gender: 'other',
  bloodGroup: 'Unknown',
  contactNumber: '',
  address: '',
  majorIssues: [],
  qrCode: `PAT-${patientAuthId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  consentGiven: false,
  consentTimestamp: null
});

const ensurePatientProfile = async (patientAuthId) =>
  Patient.findOneAndUpdate(
    { patientAuthId },
    { $setOnInsert: buildDefaultPatientProfile(patientAuthId) },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

export const getConsentStatus = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user._id);
    res.json({
      consentGiven: Boolean(patient.consentGiven),
      consentTimestamp: patient.consentTimestamp
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const acceptConsent = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user._id);

    if (!patient.consentGiven) {
      patient.consentGiven = true;
      patient.consentTimestamp = new Date();
      await patient.save();
    }

    res.json({
      message: 'Consent accepted successfully',
      consentGiven: true,
      consentTimestamp: patient.consentTimestamp
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
