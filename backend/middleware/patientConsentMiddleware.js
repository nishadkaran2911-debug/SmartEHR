import Patient from '../models/Patient.js';

export const requirePatientConsent = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ patientAuthId: req.user._id }).select('consentGiven');

    if (!patient || !patient.consentGiven) {
      return res.status(403).json({
        code: 'CONSENT_REQUIRED',
        message: 'Patient consent is required before accessing this resource'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
