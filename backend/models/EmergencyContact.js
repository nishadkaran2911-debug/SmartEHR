import mongoose from 'mongoose';

const emergencyContactSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    name: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

emergencyContactSchema.index({ patientId: 1, createdAt: -1 });

const EmergencyContact = mongoose.model('EmergencyContact', emergencyContactSchema);
export default EmergencyContact;
