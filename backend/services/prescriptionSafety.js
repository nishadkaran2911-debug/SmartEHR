const interactionDataset = [
  {
    drug: 'aspirin',
    conflictsWith: ['ibuprofen', 'warfarin'],
    explanation: 'This combination may increase risk of bleeding.'
  },
  {
    drug: 'ibuprofen',
    conflictsWith: ['aspirin'],
    explanation: 'Concurrent use can irritate the stomach and increase bleeding risk.'
  },
  {
    drug: 'amoxicillin',
    conflictsWith: ['methotrexate'],
    explanation: 'This combination can raise methotrexate exposure and toxicity.'
  },
  {
    drug: 'warfarin',
    conflictsWith: ['aspirin'],
    explanation: 'Both medicines can raise anticoagulation risk and cause bleeding.'
  },
  {
    drug: 'sildenafil',
    conflictsWith: ['nitrates'],
    explanation: 'This pairing can cause a dangerous drop in blood pressure.'
  }
];

export const normalizeDrugName = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const toDisplayDrugName = (value = '') =>
  String(value)
    .trim()
    .replace(/\s+/g, ' ');

const parseDurationDays = (duration = '') => {
  const lower = String(duration).toLowerCase().trim();
  const directNumber = Number(lower);

  if (Number.isFinite(directNumber) && directNumber > 0) {
    return directNumber;
  }

  const match = lower.match(/(\d+)\s*(day|days|week|weeks|month|months)/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];

  if (unit.startsWith('week')) return amount * 7;
  if (unit.startsWith('month')) return amount * 30;
  return amount;
};

export const calculateMedicationEndDate = (duration = '', startDate = new Date()) => {
  const days = parseDurationDays(duration);
  if (!days) return null;

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  return endDate;
};

const isMedicationActive = (medication) => {
  if (!medication?.name) return false;
  if (!medication.endDate) return true;

  const parsedEndDate = new Date(medication.endDate);
  if (Number.isNaN(parsedEndDate.getTime())) return true;

  return parsedEndDate >= new Date();
};

export const getActiveMedicationList = ({ patient, prescriptions }) => {
  const directMedications = (patient?.currentMedications || [])
    .filter(isMedicationActive)
    .map((item) => ({
      name: toDisplayDrugName(item.name),
      dosage: item.dosage || '',
      frequency: item.frequency || 'As directed',
      startDate: item.startDate || null,
      endDate: item.endDate || null,
      source: 'patient-profile'
    }));

  const seen = new Set(directMedications.map((item) => normalizeDrugName(item.name)));

  for (const prescription of prescriptions || []) {
    for (const medicine of prescription.medicines || []) {
      const normalizedName = normalizeDrugName(medicine.name);
      if (!normalizedName || seen.has(normalizedName)) continue;
      if (!isMedicationActive(medicine)) continue;

      seen.add(normalizedName);
      directMedications.push({
        name: toDisplayDrugName(medicine.name),
        dosage: medicine.dosage || '',
        frequency: medicine.frequency || 'As directed',
        startDate: medicine.startDate || prescription.date || null,
        endDate: medicine.endDate || null,
        source: 'prescription-history'
      });
    }
  }

  return directMedications;
};

export const evaluatePrescriptionSafety = ({ patient, newMedicines, prescriptions }) => {
  const alerts = [];
  const allergies = (patient?.allergies || []).map((item) => ({
    raw: toDisplayDrugName(item),
    normalized: normalizeDrugName(item)
  })).filter((item) => item.normalized);

  const activeMedications = getActiveMedicationList({ patient, prescriptions });

  for (const medicine of newMedicines || []) {
    const newDrug = toDisplayDrugName(medicine.name);
    const normalizedNewDrug = normalizeDrugName(newDrug);
    if (!normalizedNewDrug) continue;

    for (const allergy of allergies) {
      if (allergy.normalized === normalizedNewDrug) {
        alerts.push({
          severity: 'high',
          category: 'allergy',
          newDrug,
          conflictingDrug: allergy.raw,
          title: 'Severe Allergy Risk',
          message: `This patient is allergic to ${allergy.raw}. Please review before prescribing.`,
          explanation: `The prescribed medication matches a documented allergy for ${allergy.raw}.`
        });
      }
    }

    for (const activeMedication of activeMedications) {
      const normalizedActiveDrug = normalizeDrugName(activeMedication.name);
      if (!normalizedActiveDrug || normalizedActiveDrug === normalizedNewDrug) continue;

      const interaction = interactionDataset.find((item) => {
        const baseDrug = normalizeDrugName(item.drug);
        const conflicts = item.conflictsWith.map(normalizeDrugName);

        return (
          (baseDrug === normalizedNewDrug && conflicts.includes(normalizedActiveDrug)) ||
          (baseDrug === normalizedActiveDrug && conflicts.includes(normalizedNewDrug))
        );
      });

      if (!interaction) continue;

      alerts.push({
        severity: 'warning',
        category: 'interaction',
        newDrug,
        conflictingDrug: activeMedication.name,
        title: 'Possible Drug Interaction',
        message: `${newDrug} may interact with ongoing medication: ${activeMedication.name}. Kindly verify.`,
        explanation: interaction.explanation
      });
    }
  }

  const uniqueAlerts = [];
  const seenAlertKeys = new Set();

  for (const alert of alerts) {
    const key = `${alert.category}:${normalizeDrugName(alert.newDrug)}:${normalizeDrugName(alert.conflictingDrug)}`;
    if (seenAlertKeys.has(key)) continue;
    seenAlertKeys.add(key);
    uniqueAlerts.push(alert);
  }

  return {
    alerts: uniqueAlerts,
    allergies: allergies.map((item) => item.raw),
    ongoingMedications: activeMedications
  };
};
