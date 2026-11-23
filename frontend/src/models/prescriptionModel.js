/**
 * Prescription Model: prescription upload, AI OCR recognition, and catalog matching.
 */
import { api, uploadPrescription } from './httpClient.js';

export const EMPTY_MEDICINE_ROW = () => ({
  name: '',
  ingredient: '',
  strength: '',
});

export const uploadPrescriptionFile = (file, mode) =>
  uploadPrescription(file, mode);

export const analyzePrescriptionAI = (prescriptionId, consent) =>
  api(`/prescriptions/${prescriptionId}/analyze`, {
    method: 'POST',
    body: { consent },
  });

export const matchPrescriptionMedicines = (prescriptionId, medicines) =>
  api(`/prescriptions/${prescriptionId}/matches`, {
    method: 'POST',
    body: { medicines },
  });
