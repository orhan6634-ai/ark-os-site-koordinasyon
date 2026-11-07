import React, { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Droplets,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';

export const WATER_DIFF_THRESHOLD_M3 = 5.0;
export const WATER_DIFF_THRESHOLD_PCT = 8.0;

// Son 24 saatin (2'şer saatlik 12 dilim) sentetik fark verisi (m³)
const SYNTHETIC_24H_DIFF_POINTS: { hourLabel: string; diffM3: number }[] = [
  { hourLabel: '00:00', diffM3: 0.9 },
  { hourLabel: '02:00', diffM3: 0.8 },
  { hourLabel: '04:00', diffM3: 1.1 },
  { hourLabel: '06:00', diffM3: 1.4 },
  { hourLabel: '08:00', diffM3: 1.8 },
  { hourLabel: '10:00', diffM3: 1.6 },
  { hourLabel: '12:00', diffM3: 1.9 },
  { hourLabel: '14:00', diffM3: 2.1 },
  { hourLabel: '16:00', diffM3: 1.7 },
  { hourLabel: '18:00', diffM3: 1.5 },
  { hourLabel: '20:00', diffM3: 1.6 },
  { hourLabel: '22:00', diffM3: 1.5 },
];

export function WaterAnomalyBanner({
  mainMeterM3,
  apartmentsTotalM3,
  isSimulatedAnomaly,
  onToggleSimulateAnomaly,
  thresholdM3 = WATER_DIFF_THRESHOLD_M3,
  thresholdPct = WATER_DIFF_THRESHOLD_PCT,
  onChangeThresholds,
}: {
  mainMeterM3: number | null;
  apartmentsTotalM3: number | null;
  isSimulatedAnomaly: boolean;
  onToggleSimulateAnomaly: () => void;
  thresholdM3?: number;
  thresholdPct?: number;
  onChangeThresholds?: (nextM3: number, nextPct: number) => void;
}) {
  const [localThresholdM3, setLocalThresholdM3] = useState<number>(thresholdM3);
  const [localThresholdPct, setLocalThresholdPct] =
    useState<number>(thresholdPct);

  const activeThresholdM3 = onChangeThresholds ? thresholdM3 : localThresholdM3;
  const activeThresholdPct = onChangeThresholds
    ? thresholdPct
    : localThresholdPct;

  const updateThresholds = (nextM3: number, nextPct: number) => {
    const clampedM3 = Math.max(0.5, Math.min(50, Number(nextM3.toFixed(1))));
    const clampedPct = Math.max(1, Math.min(50, Number(nextPct.toFixed(1))));
    setLocalThresholdM3(clampedM3);
    setLocalThresholdPct(clampedPct);
    onChangeThresholds?.(clampedM3, clampedPct);
  };

  if (mainMeterM3 === null || apartmentsTotalM3 === null) {
    return (
      <div className="mb-4 rounded-xl border border-slate-300 bg-slate-100 p-3.5 text-xs font-semibold text-slate-800">
        Su sayacı verilerinden biri eksik olduğu için ana sayaç / daire toplamı
        fark karşılaştırması şu an yapılamıyor (Veri yok).
      </div>
    );
  }

  const diffM3 = Number((mainMeterM3 - apartmentsTotalM3).toFixed(2));
  const diffPct =
    mainMeterM3 > 0 ? Number(((diffM3 / mainMeterM3) * 100).toFixed(1)) : 0;

  const isAnomaly =
    diffM3 >= activeThresholdM3 || diffPct >= activeThresholdPct;

  // Son dilimi güncel fark değeriyle eşleştir
  const chartPoints = SYNTHETIC_24H_DIFF_POINTS.map((pt, idx) =>
    idx === SYNTHETIC_24H_DIFF_POINTS.length - 1
      ? { hourLabel: 'Şimdi', diffM3: Math.max(0, diffM3) }
      : pt
  );
  const maxChartVal = Math.max(
    activeThresholdM3 * 1.3,
    ...chartPoints.map((p) => p.diffM3),
    6
  );

  return (
    <div
      data-testid="water-anomaly-box"
      className={`mb-4 rounded-xl border p-4 shadow-sm transition ${
        isAnomaly
          ? 'border-2 border-amber-500 bg-amber-50 text-amber-950'
          : 'border-slate-300 bg-white text-slate-900'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 rounded-lg p-2 ${
              isAnomaly
                ? 'bg-amber-200 text-amber-950'
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
              <h3 className="text-sm font-extrabold sm:text-base">
                {isAnomaly
                  ? 'İnceleme Gerektiren Anomali: Ana Sayaç ve Daire Toplamı Farkı Eşiği Aştı'
                  : 'Su Sayaçları Fark Kontrolü: Normal Eşik Aralığında'}
              </h3>
              <span
                data-testid="water-anomaly-status-badge"
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-extrabold ${
                  isAnomaly
                    ? 'bg-amber-700 text-white'
                    : 'bg-emerald-100 text-emerald-950'
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

            <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-800 sm:text-sm">
              Ana Sayaç: <strong>{mainMeterM3} m³</strong> • Daire Sayaçları
              Toplamı: <strong>{apartmentsTotalM3} m³</strong> • Hesaplanan Fark:{' '}
              <strong
                data-testid="water-diff-value"
                className="rounded bg-slate-200/80 px-1.5 py-0.5 font-extrabold text-slate-950"
              >
                {diffM3} m³ (%{diffPct})
              </strong>{' '}
              <span className="text-xs font-semibold text-slate-700">
                (Aktif inceleme eşiği: {activeThresholdM3} m³ veya %
                {activeThresholdPct} —{' '}
                <span className="underline">örnek değer</span>)
              </span>
            </p>

            {isAnomaly && (
              <div className="mt-2.5 rounded-lg border border-amber-400 bg-white p-2.5 text-xs font-medium text-slate-900">
                <strong>Değerlendirme Notu (Kesin Hüküm Değildir):</strong> Bu
                fark tek başına kesin bir arıza anlamına gelmez;{' '}
                <strong>inceleme gerektiren anomali</strong> olarak işaretlenmiştir.
                Ortak alan bahçe sulaması, depo dolum saati farkı veya alt sayaç
                okuma gecikmesinden kaynaklanabilir. Teknik görevlinin ana
                kollektör ve depo şamandıra vanalarını yerinde incelemesi önerilir.
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          data-testid="toggle-water-anomaly-btn"
          onClick={onToggleSimulateAnomaly}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-extrabold transition ${
            isSimulatedAnomaly
              ? 'border-slate-400 bg-white text-slate-900 hover:bg-slate-100'
              : 'border-amber-400 bg-amber-100 text-amber-950 hover:bg-amber-200'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {isSimulatedAnomaly
            ? 'Normal Su Farkına Dön (Simülasyonu Kapat)'
            : 'Su Farkı Simülasyonu Üret (Eşik Aşımı Testi)'}
        </button>
      </div>

      {/* FAZ 5.1: AYARLANABİLİR EŞİK DEĞERİ VE SON 24 SAAT SENTETİK MİNİ GRAFİK */}
      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-3.5 lg:grid-cols-2">
        {/* Sol: Ayarlanabilir Eşik Kontrolleri ("örnek değer" etiketli) */}
        <div
          data-testid="water-threshold-controls"
          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-900">
              İnceleme Eşiği Ayarı (Varsayılan: 5 m³ / %8 —{' '}
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-bold text-indigo-950">
                örnek değer
              </span>
              )
            </span>
            <button
              type="button"
              data-testid="reset-water-threshold-btn"
              onClick={() =>
                updateThresholds(
                  WATER_DIFF_THRESHOLD_M3,
                  WATER_DIFF_THRESHOLD_PCT
                )
              }
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline"
            >
              <RotateCcw className="h-3 w-3" />
              Varsayılana Dön
            </button>
          </div>

          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="water-threshold-m3-input"
                className="block text-xs font-bold text-slate-800"
              >
                Hacim Fark Eşiği (m³):{' '}
                <strong className="text-indigo-900">{activeThresholdM3} m³</strong>
              </label>
              <input
                id="water-threshold-m3-input"
                data-testid="water-threshold-m3-input"
                type="number"
                step="0.5"
                min="0.5"
                max="50"
                value={activeThresholdM3}
                onChange={(e) =>
                  updateThresholds(
                    Number(e.target.value) || WATER_DIFF_THRESHOLD_M3,
                    activeThresholdPct
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="water-threshold-pct-input"
                className="block text-xs font-bold text-slate-800"
              >
                Oran Fark Eşiği (%):{' '}
                <strong className="text-indigo-900">%{activeThresholdPct}</strong>
              </label>
              <input
                id="water-threshold-pct-input"
                data-testid="water-threshold-pct-input"
                type="number"
                step="0.5"
                min="1"
                max="50"
                value={activeThresholdPct}
                onChange={(e) =>
                  updateThresholds(
                    activeThresholdM3,
                    Number(e.target.value) || WATER_DIFF_THRESHOLD_PCT
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Sağ: Son 24 Saatin Fark Değerini Gösteren Sentetik Mini Grafik ("Örnek veri" etiketli) */}
        <div
          data-testid="water-24h-mini-chart"
          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
              <BarChart3 className="h-4 w-4 text-blue-700" />
              Son 24 Saat Sayaç Farkı Eğilimi (m³)
            </span>
            <span className="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-extrabold text-slate-900">
              Örnek veri (Sentetik 24s)
            </span>
          </div>

          <div
            role="img"
            aria-label="Son 24 saatlik sentetik su farkı mini grafiği"
            className="flex h-16 items-end gap-1.5 pt-2"
          >
            {chartPoints.map((pt, idx) => {
              const heightPct = Math.max(
                12,
                Math.min(100, Math.round((pt.diffM3 / maxChartVal) * 100))
              );
              const exceeds = pt.diffM3 >= activeThresholdM3;
              return (
                <div
                  key={`${pt.hourLabel}-${idx}`}
                  className="flex flex-1 flex-col items-center justify-end h-full"
                  title={`${pt.hourLabel}: ${pt.diffM3} m³ (Örnek veri)`}
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      exceeds ? 'bg-amber-600' : 'bg-blue-600'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="mt-1 text-[9px] font-bold text-slate-700">
                    {pt.hourLabel === 'Şimdi'
                      ? 'Şimdi'
                      : pt.hourLabel.slice(0, 2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WaterAnomalyBanner;
