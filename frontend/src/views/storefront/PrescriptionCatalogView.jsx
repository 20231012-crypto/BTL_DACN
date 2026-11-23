/**
 * Prescription Catalog View powered by usePrescriptionCatalogController.
 */
import React from 'react';
import { usePrescriptionCatalogController } from '../../controllers/usePrescriptionCatalogController.js';
import PharmacistChat from '../components/PharmacistChat.jsx';

export default function PrescriptionCatalogView({
  config,
  onUpload,
  onOrder,
  renderProduct,
}) {
  const c = usePrescriptionCatalogController({ config, onUpload, onOrder });

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
            onChange={c.upload}
            disabled={c.busy}
          />
          <strong>
            {c.prescription
              ? c.prescription.fileName
              : 'Tải ảnh hoặc PDF đơn thuốc'}
          </strong>
          <span>JPG, PNG hoặc PDF · Tối đa 5 MB</span>
        </label>
        {c.prescription && (
          <>
            <p>
              Đơn đã được đính kèm để sử dụng khi đặt hàng. Dược sĩ sẽ đối chiếu
              trước khi xử lý.
            </p>
            <label className="radio-line">
              <input
                type="checkbox"
                checked={c.consent}
                onChange={(event) => c.setConsent(event.target.checked)}
              />
              Đồng ý gửi ảnh đơn đến dịch vụ AI (Google Gemini) để nhận diện tên
              thuốc.
            </label>
            <button
              className="btn btn-primary"
              onClick={c.analyze}
              disabled={
                c.busy || !c.consent || !config?.prescriptionReadingConfigured
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
              {c.preview && (
                <aside
                  className="prescription-preview"
                  aria-label="Ảnh đơn thuốc"
                >
                  <h2>Đơn thuốc của bạn</h2>
                  {c.preview.isImage ? (
                    <a
                      href={c.preview.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Bấm để xem ảnh lớn"
                    >
                      <img
                        src={c.preview.url}
                        alt="Ảnh đơn thuốc đã tải lên"
                      />
                    </a>
                  ) : (
                    <div className="prescription-preview-file">
                      <strong>{c.preview.name}</strong>
                      <a
                        className="btn btn-outline"
                        href={`/api/prescriptions/${c.prescription.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Mở đơn thuốc (PDF)
                      </a>
                    </div>
                  )}
                  <p className="small muted">
                    Đối chiếu tên thuốc bên cạnh với ảnh đơn.
                  </p>
                </aside>
              )}
              <form onSubmit={c.findMatches}>
                <h2>Đối chiếu thuốc trong đơn</h2>
                <p className="small muted">
                  Kiểm tra lại cách viết và hàm lượng theo ảnh. Chỉ nhập hoạt
                  chất khi có ghi trên đơn.
                </p>
                {c.medicines.map((row, index) => (
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
                            c.updateMedicineField(
                              index,
                              key,
                              event.target.value,
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
                            c.updateMedicineField(
                              index,
                              'quantity',
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={c.busy || !row.name.trim()}
                        onClick={() => c.orderRow(index)}
                      >
                        Đặt hàng
                      </button>
                      <button
                        type="button"
                        className="subtle-link"
                        disabled={c.busy || c.medicines.length === 1}
                        onClick={() => c.removeMedicineRow(index)}
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
                    disabled={c.busy || c.medicines.length >= 30}
                    onClick={c.addMedicineRow}
                  >
                    Thêm tên thuốc
                  </button>
                  <button className="btn btn-primary" disabled={c.busy}>
                    Tìm thuốc trong đơn
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
        {c.busy && <p role="status">Đang xử lý…</p>}
        {c.error && (
          <p role="alert" className="error-box">
            {c.error}
          </p>
        )}
      </section>
      <section className="panel pharmacist-consult">
        <h2>Trao đổi trực tiếp với dược sĩ</h2>
        <p className="muted">
          Không muốn dùng AI đọc đơn? Dược sĩ sẽ xem đơn thuốc của bạn và trò
          chuyện để tư vấn thuốc trong đơn, sản phẩm thay thế và cách dùng.
          {c.prescription
            ? ' Đơn bạn vừa tải lên sẽ được gắn vào cuộc tư vấn này.'
            : ' Tải đơn thuốc lên ở trên nếu muốn dược sĩ xem đơn cùng bạn.'}
        </p>
        <PharmacistChat prescription={c.prescription} />
      </section>
      <div id="prescription-results" />
      {c.notice && (
        <p role="status" className="muted prescription-notice">
          {c.notice}
        </p>
      )}
      {c.results && c.results.length === 0 && (
        <p>Chưa đọc được tên thuốc. Bạn có thể nhập tên từ đơn để tìm.</p>
      )}
      {c.results?.map((row, index) => (
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
