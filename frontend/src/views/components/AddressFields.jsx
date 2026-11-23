/**
 * Cascading Address Fields View powered by useAddressFieldsController.
 */
import React from 'react';
import { useAddressFieldsController } from '../../controllers/useAddressFieldsController.js';
import SearchSelect from './SearchSelect.jsx';

export default function AddressFields({ address, onChange }) {
  const c = useAddressFieldsController({ address, onChange });

  return (
    <>
      <div className="form-grid">
        {[
          ['recipient', 'Họ tên người nhận'],
          ['phone', 'Số điện thoại'],
        ].map(([key, title]) => (
          <label className="field" key={key}>
            <span>{title}</span>
            <input
              required
              value={address[key] || ''}
              maxLength={key === 'phone' ? 15 : 100}
              type={key === 'phone' ? 'tel' : 'text'}
              onChange={(event) =>
                onChange({ ...address, [key]: event.target.value })
              }
            />
          </label>
        ))}
        <label className="field">
          <span>Hệ địa danh</span>
          <select
            value={c.version}
            onChange={(event) => c.switchVersion(event.target.value)}
          >
            <option value="current">Hiện hành (tỉnh, phường/xã)</option>
            <option value="legacy">
              Địa chỉ cũ (tỉnh, quận/huyện, phường/xã)
            </option>
          </select>
        </label>
        <SearchSelect
          label="Tỉnh / Thành phố"
          value={address.city}
          options={c.provinces}
          loading={c.loading === 'provinces'}
          required
          onChange={(row) =>
            onChange({ ...address, city: row.name, district: '', ward: '' })
          }
        />
        {c.legacy && (
          <SearchSelect
            label="Quận / Huyện"
            value={address.district}
            options={c.districts}
            disabled={!c.province || c.districts.length === 0}
            loading={c.loading === 'children'}
            required
            onChange={(row) =>
              onChange({ ...address, district: row.name, ward: '' })
            }
          />
        )}
        <SearchSelect
          label="Phường / Xã"
          value={address.ward}
          options={c.wards}
          disabled={
            !c.province || (c.legacy && !c.district) || c.wards.length === 0
          }
          loading={
            c.loading === 'wards' || (!c.legacy && c.loading === 'children')
          }
          required
          onChange={(row) => onChange({ ...address, ward: row.name })}
        />
        <label className="field">
          <span>Số nhà, tên đường</span>
          <input
            required
            value={address.line1 || ''}
            maxLength={255}
            onChange={(event) =>
              onChange({ ...address, line1: event.target.value })
            }
          />
        </label>
      </div>
      {c.error && (
        <p role="alert">
          {c.error}{' '}
          <button type="button" className="subtle-link" onClick={c.retry}>
            Thử lại
          </button>
        </p>
      )}
    </>
  );
}
