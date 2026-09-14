import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';
import MedicalHistory from '../models/MedicalHistory.js';
import PatientReport from '../models/PatientReport.js';
import Prescription from '../models/Prescription.js';
import { extractReadableSnippets, generatePatientSummary } from '../services/patientSummary.js';
import {
  calculateMedicationEndDate,
  evaluatePrescriptionSafety
} from '../services/prescriptionSafety.js';

const normalizeTestName = (value = '') => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const tokenize = (value = '') => value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 3);

const toHistoryResponse = (item) => ({
  ...item.toJSON(),
  reportFile: item.reportId ? `/api/reports/${item.reportId}/file` : item.reportFile
});

const matchesRequestedTest = (requestedName, values) => {
  const normalizedRequestedName = normalizeTestName(requestedName);
  const requestedTokens = tokenize(requestedName);

  if (!normalizedRequestedName) return false;

  return values.some((value) => {
    if (!value) return false;

    const rawValue = String(value).toLowerCase();
    const normalizedValue = normalizeTestName(rawValue);

    if (
      normalizedValue === normalizedRequestedName ||
      normalizedValue.includes(normalizedRequestedName) ||
      normalizedRequestedName.includes(normalizedValue)
    ) {
      return true;
    }

    return requestedTokens.length > 0 && requestedTokens.every((token) => rawValue.includes(token));
  });
};

export const getDashboard = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorAuthId: req.user._id }).populate('doctorAuthId', 'name email');
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyPatient = async (req, res) => {
  try {
    const { qrCode } = req.body;
    const patient = await Patient.findOne({ qrCode }).populate('patientAuthId', 'name email');
    
    if (!patient) return res.status(404).json({ message: 'Patient not found or invalid QR code' });
    
    // In a real app we might create a temporary "grant" token, here we just return the patient id for the frontend to use in subsequent requests
    res.json({
      message: 'Patient verified successfully',
      patientId: patient._id,
      name: patient.patientAuthId?.name || 'Unknown Patient'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId).populate('patientAuthId', 'name email');
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPatientHistory = async (req, res) => {
  try {
    const history = await MedicalHistory.find({ patientId: req.params.patientId }).sort({ date: -1 });
    res.json(history.map(toHistoryResponse));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPatientPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patientId: req.params.patientId }).sort({ date: -1 });
    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPatientSummary = async (req, res) => {
  try {
    const [patient, history, prescriptions] = await Promise.all([
      Patient.findById(req.params.patientId).populate('patientAuthId', 'name email'),
      MedicalHistory.find({ patientId: req.params.patientId }).sort({ date: -1 }),
      Prescription.find({ patientId: req.params.patientId }).sort({ date: -1 })
    ]);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const summary = await generatePatientSummary({ patient, history, prescriptions });
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addMedicalHistory = async (req, res) => {
  try {
    const { type, title, description, date, reportFile } = req.body;
    const patientId = req.params.patientId;
    
    const doctor = await Doctor.findOne({ doctorAuthId: req.user._id });
    const doctorName = req.user.name;

    // DUPLICATE TEST DETECTION: check if same test was done within the last 30 days
    if (type === 'test') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentDuplicate = await MedicalHistory.findOne({
        patientId,
        type: 'test',
        title: { $regex: new RegExp(`^${title}$`, 'i') },
        date: { $gte: thirtyDaysAgo }
      });

      if (recentDuplicate) {
        return res.status(400).json({ 
          warning: true, 
          message: `Warning: A similar test (${title}) was already recorded recently on ${recentDuplicate.date.toDateString()}.` 
        });
      }
    }

    const historyEntry = await MedicalHistory.create({
      patientId,
      type,
      title,
      description,
      doctorName,
      hospitalName: doctor.hospitalName,
      date: date || Date.now(),
      reportFile
    });

    res.status(201).json(historyEntry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const requestTest = async (req, res) => {
  try {
    const { testName, notes, requestedDate } = req.body;
    const patientId = req.params.patientId;

    if (!testName?.trim()) {
      return res.status(400).json({ message: 'Test name is required' });
    }

    const doctor = await Doctor.findOne({ doctorAuthId: req.user._id });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const recentMatches = await MedicalHistory.find({
      patientId,
      type: { $in: ['test', 'report'] },
      date: { $gte: fifteenDaysAgo }
    }).sort({ date: -1 });

    const reportDocs = await PatientReport.find({
      _id: { $in: recentMatches.map((entry) => entry.reportId).filter(Boolean) }
    }).select('_id title description originalFileName fileData');

    const reportMap = new Map(reportDocs.map((report) => [String(report._id), report]));

    const existingRecord = recentMatches.find((entry) => {
      const valuesToCheck = [entry.title, entry.description];

      if (entry.reportId) {
        const report = reportMap.get(String(entry.reportId));
        if (report) {
          valuesToCheck.push(report.title, report.description, report.originalFileName);
          valuesToCheck.push(...extractReadableSnippets(report.fileData));
        }
      }

      return matchesRequestedTest(testName, valuesToCheck);
    });

    if (existingRecord) {
      return res.status(400).json({
        warning: true,
        message: 'Test is already done within the last 15 days.',
        existingRecord: toHistoryResponse(existingRecord)
      });
    }

    const requestedTest = await MedicalHistory.create({
      patientId,
      type: 'test',
      title: testName.trim(),
      description: notes?.trim() || 'Test requested by doctor.',
      doctorName: req.user.name,
      hospitalName: doctor.hospitalName,
      date: requestedDate || Date.now(),
      uploadedByRole: 'doctor'
    });

    res.status(201).json({
      message: 'Test requested successfully.',
      test: toHistoryResponse(requestedTest)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addPrescription = async (req, res) => {
  try {
    const { medicines, notes, override = false, overrideReason = '' } = req.body;
    const patientId = req.params.patientId;
    const doctor = await Doctor.findOne({ doctorAuthId: req.user._id });
    const doctorId = doctor?._id;

    if (!doctorId) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const [patient, existingPrescriptions] = await Promise.all([
      Patient.findById(patientId),
      Prescription.find({ patientId }).sort({ date: -1 })
    ]);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const safetyReview = evaluatePrescriptionSafety({
      patient,
      newMedicines: medicines,
      prescriptions: existingPrescriptions
    });

    if (safetyReview.alerts.length > 0 && !override) {
      return res.status(400).json({
        warning: true,
        requiresOverride: true,
        title: safetyReview.alerts.some((alert) => alert.severity === 'high')
          ? 'Severe Allergy Risk'
          : 'Possible Drug Interaction',
        message: 'Prescription safety review detected clinical risks that require confirmation.',
        alerts: safetyReview.alerts,
        allergies: safetyReview.allergies,
        ongoingMedications: safetyReview.ongoingMedications
      });
    }

    const prescriptionDate = new Date();
    const medicinesWithTimeline = (medicines || []).map((medicine) => ({
      ...medicine,
      frequency: medicine.frequency || 'As directed',
      startDate: prescriptionDate,
      endDate: calculateMedicationEndDate(medicine.duration, prescriptionDate)
    }));

    const prescription = await Prescription.create({
      patientId,
      doctorId,
      medicines: medicinesWithTimeline,
      notes,
      safetyReview: {
        override: Boolean(override),
        reason: overrideReason?.trim() || '',
        checkedAt: prescriptionDate,
        alerts: safetyReview.alerts
      }
    });

    patient.currentMedications = [
      ...(patient.currentMedications || []).filter((item) => {
        if (!item?.name) return false;
        if (!item.endDate) return true;
        return new Date(item.endDate) >= prescriptionDate;
      }),
      ...medicinesWithTimeline.map((medicine) => ({
        name: medicine.name,
        dosage: medicine.dosage,
        frequency: medicine.frequency,
        startDate: medicine.startDate,
        endDate: medicine.endDate
      }))
    ];

    await patient.save();

    res.status(201).json(prescription);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const checkPrescriptionSafety = async (req, res) => {
  try {
    const { medicines } = req.body;
    const patientId = req.params.patientId;

    const [patient, prescriptions] = await Promise.all([
      Patient.findById(patientId),
      Prescription.find({ patientId }).sort({ date: -1 })
    ]);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const safetyReview = evaluatePrescriptionSafety({
      patient,
      newMedicines: medicines,
      prescriptions
    });

    res.json({
      ok: true,
      alerts: safetyReview.alerts,
      allergies: safetyReview.allergies,
      ongoingMedications: safetyReview.ongoingMedications
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
