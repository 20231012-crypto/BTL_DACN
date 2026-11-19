import { useEffect, useState } from 'react';
import { api } from './lib.js';
import SearchSelect from './SearchSelect.jsx';

export default function AddressFields({ address, onChange }) {
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
    setLoading('provinces'); setError('');
    api(`/locations?version=${version}`, { signal: controller.signal }).then(setProvinces)
      .catch((error) => { if (error.name !== 'AbortError') setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(''); });
    return () => controller.abort();
  }, [version, revision]);
  useEffect(() => {
    setDistricts([]); setWards([]);
    if (!province) return;
    const controller = new AbortController();
    setLoading('children'); setError('');
    api(`/locations?version=${version}&province=${province.code}`, { signal: controller.signal })
      .then(legacy ? setDistricts : setWards)
      .catch((error) => { if (error.name !== 'AbortError') setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(''); });
    return () => controller.abort();
  }, [province?.code, version, revision]);
  useEffect(() => {
    if (!legacy || !province || !district) return;
    const controller = new AbortController();
    setLoading('wards'); setError('');
    api(`/locations?version=legacy&province=${province.code}&district=${district.code}`, { signal: controller.signal })
      .then(setWards).catch((error) => { if (error.name !== 'AbortError') setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(''); });
    return () => controller.abort();
  }, [province?.code, district?.code, legacy, revision]);
  return <>
    <div className="form-grid">
      {[['recipient', 'Họ tên người nhận'], ['phone', 'Số điện thoại']].map(([key, title]) => <label className="field" key={key}>
        <span>{title}</span><input required value={address[key] || ''} maxLength={key === 'phone' ? 15 : 100}
          type={key === 'phone' ? 'tel' : 'text'} onChange={(event) => onChange({ ...address, [key]: event.target.value })} />
      </label>)}
      <label className="field"><span>Hệ địa danh</span><select value={version} onChange={(event) => {
        setLegacy(event.target.value === 'legacy'); setProvinces([]); setDistricts([]); setWards([]);
        onChange({ ...address, city: '', district: '', ward: '' });
      }}><option value="current">Hiện hành (tỉnh, phường/xã)</option><option value="legacy">Địa chỉ cũ (tỉnh, quận/huyện, phường/xã)</option></select></label>
      <SearchSelect label="Tỉnh / Thành phố" value={address.city} options={provinces} loading={loading === 'provinces'} required
        onChange={(row) => onChange({ ...address, city: row.name, district: '', ward: '' })} />
      {legacy && <SearchSelect label="Quận / Huyện" value={address.district} options={districts} disabled={!province}
        loading={loading === 'children'} required onChange={(row) => onChange({ ...address, district: row.name, ward: '' })} />}
      <SearchSelect label="Phường / Xã" value={address.ward} options={wards} disabled={!province || (legacy && !district)}
        loading={loading === 'wards' || (!legacy && loading === 'children')} required onChange={(row) => onChange({ ...address, ward: row.name })} />
      <label className="field"><span>Số nhà, tên đường</span><input required value={address.line1 || ''} maxLength={255}
        onChange={(event) => onChange({ ...address, line1: event.target.value })} /></label>
    </div>
    {error && <p role="alert">{error} <button type="button" className="subtle-link" onClick={() => setRevision(revision + 1)}>Thử lại</button></p>}
  </>;
}
