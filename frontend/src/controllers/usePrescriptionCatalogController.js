/**
 * Prescription Catalog Controller: handles prescription upload, local preview, Gemini AI analysis, and line matching.
 */
import { useEffect, useState } from 'react';
import {
  EMPTY_MEDICINE_ROW,
  analyzePrescriptionAI,
  matchPrescriptionMedicines,
  uploadPrescriptionFile,
} from '../models/prescriptionModel.js';

export function usePrescriptionCatalogController({
  config,
  onUpload,
  onOrder,
}) {
  const [prescription, setPrescription] = useState(null);
  const [medicines, setMedicines] = useState([EMPTY_MEDICINE_ROW()]);
  const [results, setResults] = useState(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(
    () => () => {
      if (preview?.url) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );

  const run = async (work) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const upload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    run(async () => {
      const uploaded = await uploadPrescriptionFile(file, config?.uploadMode);
      setPrescription(uploaded);
      setPreview({
        url: URL.createObjectURL(file),
        isImage: file.type.startsWith('image/'),
        name: file.name,
      });
      onUpload(uploaded);
      setResults(null);
      setNotice('');
    });
  };

  const analyze = () =>
    run(async () => {
      const data = await analyzePrescriptionAI(prescription.id, consent);
      setMedicines(
        data.medicines.length ? data.medicines : [EMPTY_MEDICINE_ROW()],
      );
      setResults(data.results);
    });

  const updateMedicineField = (index, key, value) =>
    setMedicines((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );

  const addMedicineRow = () =>
    setMedicines((prev) => [...prev, EMPTY_MEDICINE_ROW()]);

  const removeMedicineRow = (index) =>
    setMedicines((prev) => prev.filter((_, i) => i !== index));

  const orderRow = (index) =>
    run(async () => {
      const row = medicines[index];
      if (!row.name.trim())
        throw new Error('Nhập tên thuốc trước khi đặt hàng.');
      const quantity = Math.min(99, Math.max(1, Number(row.quantity) || 1));
      const { results: found } = await matchPrescriptionMedicines(
        prescription.id,
        [{ name: row.name, ingredient: row.ingredient, strength: row.strength }],
      );
      const entry = found[0];
      if (entry.matches.length === 1) {
        setNotice('');
        await onOrder(entry.matches[0], quantity);
        return;
      }
      const all = await matchPrescriptionMedicines(
        prescription.id,
        medicines
          .filter((item) => item.name.trim())
          .map(({ name, ingredient, strength }) => ({
            name,
            ingredient,
            strength,
          })),
      );
      setResults(all.results);
      setNotice(
        entry.matches.length > 1
          ? `Có ${entry.matches.length} sản phẩm phù hợp với "${row.name}". Hãy chọn sản phẩm bên dưới để đặt hàng.`
          : entry.related.length
            ? `Chưa có sản phẩm đúng tên "${row.name}". Bên dưới là sản phẩm cùng hoạt chất, dược sĩ sẽ đối chiếu trước khi xử lý đơn.`
            : `Chưa có sản phẩm khớp "${row.name}" trong danh mục. Bạn có thể trao đổi với dược sĩ ở phần bên dưới.`,
      );
      setTimeout(
        () =>
          document
            .getElementById('prescription-results')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        100,
      );
    });

  const findMatches = (event) => {
    event.preventDefault();
    run(async () => {
      const data = await matchPrescriptionMedicines(
        prescription.id,
        medicines.filter((row) => row.name.trim()),
      );
      setResults(data.results);
    });
  };

  return {
    prescription,
    medicines,
    results,
    consent,
    setConsent,
    busy,
    error,
    preview,
    notice,
    upload,
    analyze,
    updateMedicineField,
    addMedicineRow,
    removeMedicineRow,
    orderRow,
    findMatches,
  };
}
