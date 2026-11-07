import React from 'react';
import { Info, ShieldCheck, X } from 'lucide-react';

export const ARK_OS_VERSION_NOTICE =
  'ARK-OS MVP v0.9 (prototip / Proof of Concept). Örnek verilerle çalışır, gerçek sensör entegrasyonu yoktur. Ticari kullanım ve entegrasyon için geliştirilmektedir.';

export function AboutModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      data-testid="about-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px] print:hidden"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-300 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-indigo-700" />
            <h2
              id="about-modal-title"
              className="text-base font-extrabold text-slate-950 sm:text-lg"
            >
              Hakkında — ARK-OS MVP v0.9
            </h2>
          </div>
          <button
            type="button"
            data-testid="close-about-modal-btn"
            aria-label="Hakkında penceresini kapat"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
            Kapat
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-800 sm:text-sm">
          <div
            data-testid="about-version-statement"
            className="rounded-xl border border-indigo-300 bg-indigo-50 p-3.5 font-bold text-indigo-950"
          >
            {ARK_OS_VERSION_NOTICE}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="flex items-center gap-1.5 font-extrabold text-slate-950">
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
              <span>Mimari ve Dürüstlük İlkeleri</span>
            </div>
            <ul className="mt-1.5 list-inside list-disc space-y-1 text-xs font-medium text-slate-700">
              <li>
                <strong>Gerçek Çevrimdışı (Offline-First) Mimari:</strong> Uygulama
                kabuğu Service Worker ile, olay kayıtları ise tarayıcı içi IndexedDB
                (Dexie) veritabanında saklanır.
              </li>
              <li>
                <strong>Hibrit Senkronizasyon:</strong> Bağlantı geldiğinde yerel
                sunucu, Vercel Serverless (<code>/api/sync</code>) veya tarayıcı içi
                simüle sunucu üzerinden mükerrer kayıt oluşturmadan senkronize olur.
              </li>
              <li>
                <strong>Kapsam Sınırı:</strong> Yapısal bina güvenliği, tahliye emri
                veya otomatik cihaz/şalter kapatma işlemi yapmaz; tüm kararlar insan
                onayına tabidir.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 flex justify-end border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800"
          >
            Anlaşıldı
          </button>
        </div>
      </div>
    </div>
  );
}

export default AboutModal;
