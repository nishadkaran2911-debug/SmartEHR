import Patient from '../models/Patient.js';
import MedicalHistory from '../models/MedicalHistory.js';
import HealthMetric from '../models/HealthMetric.js';
import Prescription from '../models/Prescription.js';
import PatientReport from '../models/PatientReport.js';
const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

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

const ensurePatientProfile = async (patientAuthId, populateUser = false) => {
  let query = Patient.findOneAndUpdate(
    { patientAuthId },
    { $setOnInsert: buildDefaultPatientProfile(patientAuthId) },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  if (populateUser) {
    query = query.populate('patientAuthId', 'name email');
  }

  return query;
};

const withReportUrls = (history) =>
  history.map((item) => ({
    ...item.toJSON(),
    reportFile: item.reportId ? `/api/reports/${item.reportId}/file` : item.reportFile
  }));

export const getDashboard = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user._id, true);
    
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user._id);

    const history = await MedicalHistory.find({ patientId: patient._id }).sort({ date: -1 });
    res.json(withReportUrls(history));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPrescriptions = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user._id);

    const prescriptions = await Prescription.find({ patientId: patient._id }).populate('doctorId', 'hospitalName').sort({ date: -1 });
    res.json(prescriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Health metrics analytics formatting
export const getMetricsAnalytics = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user._id);

    const type = req.query.type; // filter by type if provided
    let filter = { patientId: patient._id };
    if (type) filter.type = type;

    const metrics = await HealthMetric.find(filter).sort({ date: 1 });
    
    // Format data for graphs (date vs value)
    const formattedData = metrics.reduce((acc, metric) => {
      if (!acc[metric.type]) acc[metric.type] = [];
      acc[metric.type].push({
        date: metric.date.toISOString().split('T')[0],
        value: metric.value,
        unit: metric.unit
      });
      return acc;
    }, {});

    res.json(formattedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addMetric = async (req, res) => {
  try {
    const { type, value, unit } = req.body;
    const patient = await ensurePatientProfile(req.user._id);

    const metric = await HealthMetric.create({
      patientId: patient._id,
      type,
      value,
      unit
    });
    res.status(201).json(metric);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadReport = async (req, res) => {
  try {
    const { title, description, date, fileName, mimeType, fileContent } = req.body;
    const patient = await ensurePatientProfile(req.user._id);

    if (!title?.trim()) {
      return res.status(400).json({ message: 'Report title is required' });
    }

    if (!fileName || !mimeType || !fileContent) {
      return res.status(400).json({ message: 'Report file is required' });
    }

    if (!allowedMimeTypes.has(mimeType)) {
      return res.status(400).json({ message: 'Only PDF, JPG, PNG, and WEBP files are supported' });
    }

    const base64Payload = String(fileContent).includes(',')
      ? String(fileContent).split(',').pop()
      : String(fileContent);

    const fileBuffer = Buffer.from(base64Payload, 'base64');

    if (!fileBuffer.length) {
      return res.status(400).json({ message: 'Uploaded file is empty' });
    }

    if (fileBuffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ message: 'File size must be 8MB or less' });
    }

    const report = await PatientReport.create({
      patientId: patient._id,
      title: title.trim(),
      description: description?.trim() || '',
      originalFileName: fileName,
      mimeType,
      sizeBytes: fileBuffer.length,
      fileData: fileBuffer,
      uploadedByRole: 'patient'
    });

    const reportEntry = await MedicalHistory.create({
      patientId: patient._id,
      reportId: report._id,
      type: 'report',
      title: title.trim(),
      description: description?.trim() || '',
      doctorName: 'Patient Upload',
      hospitalName: 'Patient Portal',
      date: date || Date.now(),
      reportFile: `/api/reports/${report._id}/file`,
      reportFileName: fileName,
      reportMimeType: mimeType,
      uploadedByRole: 'patient'
    });

    res.status(201).json(reportEntry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
