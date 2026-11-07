import React from 'react';
import { AlertTriangle, CheckCircle2, Droplets, SlidersHorizontal } from 'lucide-react';

export const WATER_DIFF_THRESHOLD_M3 = 5.0;
export const WATER_DIFF_THRESHOLD_PCT = 8.0;

export function WaterAnomalyBanner({
  mainMeterM3,
  apartmentsTotalM3,
  isSimulatedAnomaly,
  onToggleSimulateAnomaly,
}: {
  mainMeterM3: number | null;
  apartmentsTotalM3: number | null;
  isSimulatedAnomaly: boolean;
  onToggleSimulateAnomaly: () => void;
}) {
  if (mainMeterM3 === null || apartmentsTotalM3 === null) {
    return (
      <div className="mb-4 rounded-xl border border-slate-300 bg-slate-100 p-3.5 text-xs text-slate-700">
        Su sayacı verilerinden biri eksik olduğu için ana sayaç / daire toplamı fark
        karşılaştırması şu an yapılamıyor (Veri yok).
      </div>
    );
  }

  const diffM3 = Number((mainMeterM3 - apartmentsTotalM3).toFixed(2));
  const diffPct =
    mainMeterM3 > 0 ? Number(((diffM3 / mainMeterM3) * 100).toFixed(1)) : 0;

  const isAnomaly =
    diffM3 >= WATER_DIFF_THRESHOLD_M3 || diffPct >= WATER_DIFF_THRESHOLD_PCT;

  return (
    <div
      data-testid="water-anomaly-box"
      className={`mb-4 rounded-xl border p-4 shadow-sm transition ${
        isAnomaly
          ? 'border-amber-400 bg-amber-50 text-amber-950'
          : 'border-slate-200 bg-white text-slate-800'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 rounded-lg p-2 ${
              isAnomaly
                ? 'bg-amber-200/80 text-amber-900'
                : 'bg-blue-50 text-blue-700'
            }`}
          >
            {isAnomaly ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Droplets className="h-5 w-5" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold sm:text-base">
                {isAnomaly
                  ? 'İnceleme Gerektiren Anomali: Ana Sayaç ve Daire Toplamı Farkı Eşiği Aştı'
                  : 'Su Sayaçları Fark Kontrolü: Normal Eşik Aralığında'}
              </h3>
              <span
                data-testid="water-anomaly-status-badge"
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold ${
                  isAnomaly
                    ? 'bg-amber-600 text-white'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isAnomaly ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5" />
                    İnceleme gerektiren anomali
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Normal aralıkta
                  </>
                )}
              </span>
            </div>

            <p className="mt-1 text-xs leading-relaxed text-slate-700">
              Ana Sayaç: <strong>{mainMeterM3} m³</strong> • Daire Sayaçları
              Toplamı: <strong>{apartmentsTotalM3} m³</strong> • Hesaplanan Fark:{' '}
              <strong data-testid="water-diff-value">
                {diffM3} m³ (%{diffPct})
              </strong>{' '}
              <span className="text-slate-500">
                (İnceleme eşiği: {WATER_DIFF_THRESHOLD_M3} m³ veya %
                {WATER_DIFF_THRESHOLD_PCT})
              </span>
            </p>

            {isAnomaly && (
              <div className="mt-2.5 rounded-lg border border-amber-300 bg-white/90 p-2.5 text-xs text-slate-800">
                <strong>Değerlendirme Notu (Kesin Hüküm Değildir):</strong> Bu fark
                tek başına kesin bir arıza anlamına gelmez. Ortak alan bahçe sulaması,
                depo dolum saati farkı, alt sayaç okuma gecikmesi veya tesisat kontrolü
                gerektiren bir durumdan kaynaklanabilir. Teknik görevlinin ana kollektör
                ve depo şamandıra vanalarını yerinde incelemesi önerilir.
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          data-testid="toggle-water-anomaly-btn"
          onClick={onToggleSimulateAnomaly}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            isSimulatedAnomaly
              ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
              : 'border-amber-300 bg-amber-100 text-amber-950 hover:bg-amber-200'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {isSimulatedAnomaly
            ? 'Normal Su Farkına Dön (Simülasyonu Kapat)'
            : 'Su Farkı Simülasyonu Üret (Eşik Aşımı Testi)'}
        </button>
      </div>
    </div>
  );
}

export default WaterAnomalyBanner;
