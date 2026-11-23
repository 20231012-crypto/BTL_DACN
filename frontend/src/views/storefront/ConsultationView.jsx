/**
 * Pharmacist Consultation Page View.
 */
import React from 'react';
import PharmacistChat from '../components/PharmacistChat.jsx';
import { RequireLogin } from '../components/UiPrimitives.jsx';

export default function ConsultationView() {
  return (
    <RequireLogin>
      <main className="container page-shell">
        <div className="page-heading">
          <span className="eyebrow">DƯỢC SĨ ĐỒNG HÀNH</span>
          <h1>Tư vấn cùng dược sĩ</h1>
          <p>
            Trò chuyện trực tiếp với dược sĩ An Tâm về thuốc và đơn thuốc của
            bạn.
          </p>
        </div>
        <section className="panel pharmacist-consult">
          <PharmacistChat />
        </section>
      </main>
    </RequireLogin>
  );
}
