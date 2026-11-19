import { useEffect, useState } from 'react';
import { api, uploadPrescription } from './lib.js';
import PharmacistChat from './PharmacistChat.jsx';

export default function PrescriptionCatalog({
  config,
  onUpload,
  onOrder,
  renderProduct,
}) {
  const [prescription, setPrescription] = useState(null);
  const [medicines, setMedicines] = useState([
    { name: '', ingredient: '', strength: '' },
  ]);
  const [results, setResults] = useState(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [notice, setNotice] = useState('');
  // Ảnh xem trước dùng tệp trên máy để hiện ngay, không cần tải lại từ máy chủ.
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
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  };
  const upload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    run(async () => {
      const uploaded = await uploadPrescription(file, config?.uploadMode);
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
      const data = await api(`/prescriptions/${prescription.id}/analyze`, {
        method: 'POST',
        body: { consent },
      });
      setMedicines(
        data.medicines.length
          ? data.medicines
          : [{ name: '', ingredient: '', strength: '' }],
      );
      setResults(data.results);
    });
  const matchRequest = (rows) =>
    api(`/prescriptions/${prescription.id}/matches`, {
      method: 'POST',
      body: { medicines: rows },
    });
  // Đặt hàng ngay cho một dòng thuốc: đúng một sản phẩm khớp thì thêm vào giỏ và sang thanh toán,
  // ngược lại hiện danh sách để khách chọn đúng sản phẩm.
  const orderRow = (index) =>
    run(async () => {
      const row = medicines[index];
      if (!row.name.trim()) throw new Error('Nhập tên thuốc trước khi đặt hàng.');
      const quantity = Math.min(99, Math.max(1, Number(row.quantity) || 1));
      const { results: found } = await matchRequest([
        { name: row.name, ingredient: row.ingredient, strength: row.strength },
      ]);
      const entry = found[0];
      if (entry.matches.length === 1) {
        setNotice('');
        await onOrder(entry.matches[0], quantity);
        return;
      }
      const all = await matchRequest(
        medicines
          .filter((item) => item.name.trim())
          .map(({ name, ingredient, strength }) => ({ name, ingredient, strength })),
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
  const find = (event) => {
    event.preventDefault();
    run(async () => {
      const data = await api(`/prescriptions/${prescription.id}/matches`, {
        method: 'POST',
        body: { medicines: medicines.filter((row) => row.name.trim()) },
      });
      setResults(data.results);
    });
  };
  return (
    <main className="container page-shell prescription-catalog">
      <div className="page-heading">
        <h1>Thuốc theo đơn của bạn</h1>
        <p>
          Tải đơn thuốc, kiểm tra tên thuốc đọc được rồi tìm sản phẩm trong nhà
          thuốc.
        </p>
      </div>
      <section className="panel">
        <label className="upload-zone">
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={upload}
            disabled={busy}
          />
          <strong>
            {prescription
              ? prescription.fileName
              : 'Tải ảnh hoặc PDF đơn thuốc'}
          </strong>
          <span>JPG, PNG hoặc PDF · Tối đa 5 MB</span>
        </label>
        {prescription && (
          <>
            <p>
              Đơn đã được đính kèm để sử dụng khi đặt hàng. Dược sĩ sẽ đối chiếu
              trước khi xử lý.
            </p>
            <label className="radio-line">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              Đồng ý gửi ảnh đơn đến dịch vụ AI (Google Gemini) để nhận diện tên thuốc.
            </label>
            <button
              className="btn btn-primary"
              onClick={analyze}
              disabled={
                busy || !consent || !config?.prescriptionReadingConfigured
              }
            >
              Đọc đơn bằng AI
            </button>
            {!config?.prescriptionReadingConfigured && (
              <p className="muted small">
                Đọc ảnh chưa được cấu hình. Bạn có thể nhập tên thuốc từ đơn bên
                dưới.
              </p>
            )}
            <div className="prescription-compare">
            {preview && (
              <aside className="prescription-preview" aria-label="Ảnh đơn thuốc">
                <h2>Đơn thuốc của bạn</h2>
                {preview.isImage ? (
                  <a href={preview.url} target="_blank" rel="noreferrer" title="Bấm để xem ảnh lớn">
                    <img src={preview.url} alt="Ảnh đơn thuốc đã tải lên" />
                  </a>
                ) : (
                  <div className="prescription-preview-file">
                    <strong>{preview.name}</strong>
                    <a
                      className="btn btn-outline"
                      href={`/api/prescriptions/${prescription.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở đơn thuốc (PDF)
                    </a>
                  </div>
                )}
                <p className="small muted">Đối chiếu tên thuốc bên cạnh với ảnh đơn.</p>
              </aside>
            )}
            <form onSubmit={find}>
              <h2>Đối chiếu thuốc trong đơn</h2>
              <p className="small muted">
                Kiểm tra lại cách viết và hàm lượng theo ảnh. Chỉ nhập hoạt chất
                khi có ghi trên đơn.
              </p>
              {medicines.map((row, index) => (
                <div className="prescription-row" key={index}>
                  {[
                    ['name', 'Tên thuốc'],
                    ['ingredient', 'Hoạt chất trên đơn'],
                    ['strength', 'Hàm lượng trên đơn'],
                  ].map(([key, label]) => (
                    <label className="field" key={key}>
                      <span>{label}</span>
                      <input
                        value={row[key]}
                        maxLength={120}
                        required={key === 'name'}
                        onChange={(event) =>
                          setMedicines(
                            medicines.map((item, i) =>
                              i === index
                                ? { ...item, [key]: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                  <div className="prescription-row-actions">
                    <label className="prescription-qty">
                      <span>Số lượng</span>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={row.quantity ?? 1}
                        onChange={(event) =>
                          setMedicines(
                            medicines.map((item, i) =>
                              i === index
                                ? { ...item, quantity: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy || !row.name.trim()}
                      onClick={() => orderRow(index)}
                    >
                      Đặt hàng
                    </button>
                    <button
                      type="button"
                      className="subtle-link"
                      disabled={busy || medicines.length === 1}
                      onClick={() =>
                        setMedicines(medicines.filter((_, i) => i !== index))
                      }
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
              <div className="prescription-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={busy || medicines.length >= 30}
                  onClick={() =>
                    setMedicines([
                      ...medicines,
                      { name: '', ingredient: '', strength: '' },
                    ])
                  }
                >
                  Thêm tên thuốc
                </button>
                <button className="btn btn-primary" disabled={busy}>
                  Tìm thuốc trong đơn
                </button>
              </div>
            </form>
            </div>
          </>
        )}
        {busy && <p role="status">Đang xử lý…</p>}
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
      </section>
      <section className="panel pharmacist-consult">
        <h2>Trao đổi trực tiếp với dược sĩ</h2>
        <p className="muted">
          Không muốn dùng AI đọc đơn? Dược sĩ sẽ xem đơn thuốc của bạn và trò
          chuyện để tư vấn thuốc trong đơn, sản phẩm thay thế và cách dùng.
          {prescription
            ? ' Đơn bạn vừa tải lên sẽ được gắn vào cuộc tư vấn này.'
            : ' Tải đơn thuốc lên ở trên nếu muốn dược sĩ xem đơn cùng bạn.'}
        </p>
        <PharmacistChat prescription={prescription} />
      </section>
      <div id="prescription-results" />
      {notice && (
        <p role="status" className="muted prescription-notice">
          {notice}
        </p>
      )}
      {results && results.length === 0 && (
        <p>Chưa đọc được tên thuốc. Bạn có thể nhập tên từ đơn để tìm.</p>
      )}
      {results?.map((row, index) => (
        <section className="panel" key={index}>
          <h2>
            {row.name} {row.strength}
          </h2>
          {row.matches.length ? (
            <>
              <h3>Sản phẩm tìm theo tên trong đơn</h3>
              <div className="product-grid">
                {row.matches.map(renderProduct)}
              </div>
            </>
          ) : (
            <p>Chưa có sản phẩm khớp tên này trong danh mục.</p>
          )}
          {row.related.length > 0 && (
            <>
              <h3>Sản phẩm cùng hoạt chất</h3>
              <p>
                Dược sĩ cần đối chiếu hàm lượng và dạng bào chế trước khi đổi
                sản phẩm.
              </p>
              <div className="product-grid">
                {row.related.map(renderProduct)}
              </div>
            </>
          )}
        </section>
      ))}
    </main>
  );
}
