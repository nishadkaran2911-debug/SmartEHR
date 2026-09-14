import mongoose from 'mongoose';

const patientReportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  originalFileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  fileData: { type: Buffer, required: true },
  uploadedByRole: { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
  uploadedAt: { type: Date, default: Date.now }
});

const PatientReport = mongoose.model('PatientReport', patientReportSchema);
export default PatientReport;