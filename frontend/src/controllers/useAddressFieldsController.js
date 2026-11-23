/**
 * Address Fields Controller: loads cascading Vietnamese administrative locations (current 2-level & legacy 3-level).
 */
import { useEffect, useState } from 'react';
import { fetchLocations } from '../models/accountModel.js';

export function useAddressFieldsController({ address, onChange }) {
  const [legacy, setLegacy] = useState(Boolean(address.district));
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState('');

  const province = provinces.find((row) => row.name === address.city);
  const district = districts.find((row) => row.name === address.district);
  const version = legacy ? 'legacy' : 'current';

  useEffect(() => {
    const controller = new AbortController();
    setLoading('provinces');
    setError('');
    fetchLocations({ version }, controller.signal)
      .then(setProvinces)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading('');
      });
    return () => controller.abort();
  }, [version, revision]);

  useEffect(() => {
    setDistricts([]);
    setWards([]);
    if (!province) return undefined;
    const controller = new AbortController();
    setLoading('children');
    setError('');
    fetchLocations({ version, province: province.code }, controller.signal)
      .then(legacy ? setDistricts : setWards)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading('');
      });
    return () => controller.abort();
  }, [province?.code, version, revision]);

  useEffect(() => {
    if (!legacy || !province || !district) return undefined;
    const controller = new AbortController();
    setLoading('wards');
    setError('');
    fetchLocations(
      { version: 'legacy', province: province.code, district: district.code },
      controller.signal,
    )
      .then(setWards)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading('');
      });
    return () => controller.abort();
  }, [province?.code, district?.code, legacy, revision]);

  const switchVersion = (nextVersion) => {
    setLegacy(nextVersion === 'legacy');
    setProvinces([]);
    setDistricts([]);
    setWards([]);
    onChange({ ...address, city: '', district: '', ward: '' });
  };

  return {
    legacy,
    version,
    provinces,
    districts,
    wards,
    province,
    district,
    error,
    loading,
    retry: () => setRevision((r) => r + 1),
    switchVersion,
  };
}
