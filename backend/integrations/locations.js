import { assert } from '../services/shared.js';

const cache = new Map();

export function installLocations(app) {
  app.get('/api/locations', async (req, res) => {
    const version = req.query.version === 'legacy' ? 'v1' : 'v2';
    const province = String(req.query.province || '');
    const district = String(req.query.district || '');
    assert(
      [province, district].every((code) => !code || /^\d{1,6}$/.test(code)),
      400,
      'Mã địa danh không hợp lệ.',
    );
    assert(
      !district || (version === 'v1' && province),
      400,
      'Chọn tỉnh trước khi chọn quận/huyện.',
    );
    const path = district
      ? `d/${district}?depth=2`
      : province
        ? `p/${province}?depth=2`
        : '';
    const key = `${version}/${path}`;
    let entry = cache.get(key);
    if (!entry || Date.now() - entry.time > 86400000) {
      try {
        const response = await fetch(
          `https://provinces.open-api.vn/api/${key}`,
          { signal: AbortSignal.timeout(7000) },
        );
        assert(response.ok, 503, 'Chưa tải được địa danh. Vui lòng thử lại.');
        const result = await response.json();
        if (district)
          assert(
            String(result.province_code) === province,
            400,
            'Quận/huyện không thuộc tỉnh đã chọn.',
          );
        const rows =
          district || (province && version === 'v2')
            ? result.wards
            : province
              ? result.districts
              : result;
        assert(Array.isArray(rows), 503, 'Dữ liệu địa danh chưa sẵn sàng.');
        entry = {
          time: Date.now(),
          rows: rows.map(({ code, name }) => ({ code, name })),
        };
        cache.set(key, entry);
      } catch (error) {
        if (!entry) {
          if (error.status) throw error;
          assert(false, 503, 'Chưa tải được địa danh. Vui lòng thử lại.');
        }
      }
    }
    res.json({ data: entry.rows });
  });
}
