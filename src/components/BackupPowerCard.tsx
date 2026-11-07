import React, { useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
} from 'lucide-react';
import { DataStatus, MetricReading } from '../types';

function StatusBadge({ status }: { status: DataStatus }) {
  if (status === 'missing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-900">
        <AlertTriangle className="h-3.5 w-3.5" />
        Veri yok
      </span>
    );
  }
  if (status === 'stale') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-950">
        <Clock className="h-3.5 w-3.5" />
        Eski veri
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-950">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Güncel
    </span>
  );
}

export function BackupPowerCard({
  reading,
  highlight = false,
}: {
  reading: MetricReading<string>;
  highlight?: boolean;
}) {
  const [showCalcDetails, setShowCalcDetails] = useState<boolean>(false);

  // Örnek hesap parametreleri (Sentetik / Simülasyon)
  const tankCapacityLiters = 250;
  const fuelPct = 72;
  const usableFuelLiters = Math.round((tankCapacityLiters * fuelPct) / 100); // 180 L
  const sampleCriticalLoadKw = 42;
  const sampleConsumptionLPerHour = 12.5;
  const estimatedHours = Number(
    (usableFuelLiters / sampleConsumptionLPerHour).toFixed(1)
  ); // 14.4 saat

  return (
    <div
      data-testid="backup-power-card"
      className={`rounded-xl border p-4 shadow-sm transition-colors ${
        highlight
          ? 'border-2 border-amber-500 bg-amber-50/70'
          : 'border-slate-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-900">
          <div className="rounded-lg bg-slate-100 p-2 text-amber-600">
            <Zap className="h-5 w-5" />
          </div>
          <span className="text-sm font-bold sm:text-base">{reading.label}</span>
        </div>
        <StatusBadge status={reading.status} />
      </div>

      <div className="mt-3">
        <span className="text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
          {reading.value ?? 'Veri Yok'}
        </span>
      </div>

      {/* FAZ 5.2: Tahmini çalışma süresi (örnek hesap) */}
      <div
        data-testid="estimated-runtime-row"
        className="mt-2.5 rounded-lg border border-amber-300 bg-amber-50/90 p-2.5 text-xs text-slate-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-1">
          <span className="font-bold text-slate-800">
            Tahmini çalışma süresi (örnek hesap):
          </span>
          <strong className="font-extrabold text-amber-950">
            ~{estimatedHours} saat (kesin süre değildir)
          </strong>
        </div>

        <button
          type="button"
          data-testid="toggle-power-calc-details-btn"
          onClick={() => setShowCalcDetails((prev) => !prev)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-extrabold text-indigo-800 underline hover:text-indigo-950"
        >
          <Calculator className="h-3.5 w-3.5" />
          <span>
            {showCalcDetails
              ? 'Hesaba giren değerleri gizle'
              : 'Hesaba giren değerleri göster (depo, yük, tüketim)'}
          </span>
          {showCalcDetails ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {showCalcDetails && (
          <div
            data-testid="power-calc-details-box"
            className="mt-2 space-y-1 rounded-md border border-amber-300 bg-white p-2.5 text-xs text-slate-800"
          >
            <div>
              • <strong>Örnek Depo Kapasitesi ve Doluluk:</strong>{' '}
              {tankCapacityLiters} L toplam kapasite × %{fuelPct} doluluk ={' '}
              <strong>{usableFuelLiters} L</strong> kullanılabilir yakıt
            </div>
            <div>
              • <strong>Örnek Kritik Yük:</strong> ~{sampleCriticalLoadKw} kW
              (Hidrofor, acil aydınlatma, güvenlik sistemi)
            </div>
            <div>
              • <strong>Örnek Saatlik Yakıt Tüketimi:</strong> ~
              {sampleConsumptionLPerHour} L/saat
            </div>
            <div className="border-t border-slate-200 pt-1 text-[11px] font-semibold text-slate-700">
              Örnek Formül: {usableFuelLiters} L ÷ {sampleConsumptionLPerHour}{' '}
              L/saat ≈ {estimatedHours} saat. Yük değişimine göre gerçek süre
              farklılık gösterir; kesin garanti vermez.
            </div>
          </div>
        )}
      </div>

      {reading.note && (
        <p className="mt-2 text-xs font-medium leading-relaxed text-slate-700">
          {reading.note}
        </p>
      )}

      {/* Zorunlu Dürüstlük Etiketi */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-slate-200 pt-2.5 text-xs text-slate-700">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          Son güncelleme:{' '}
          <strong className="font-bold text-slate-900">
            {reading.updatedAt ?? 'Bilinmiyor'}
          </strong>
        </span>
        <span
          data-testid="backup-power-sim-label"
          className="rounded bg-amber-200/80 px-2 py-0.5 text-[11px] font-extrabold text-amber-950"
        >
          Simülasyon, gerçek ölçüm değildir
        </span>
      </div>
    </div>
  );
}

export default BackupPowerCard;
