import React from 'react';
import {
  AlertTriangle,
  CloudRain,
  Droplets,
  PowerOff,
  Sliders,
  Sun,
  Unplug,
  WifiOff,
  X,
} from 'lucide-react';
import { PlaybookId } from '../types';

export function DemoControlPanel({
  isOpen,
  onToggleOpen,
  onClose,
  simulatedOffline,
  onToggleSimulatedOffline,
  simulatedPowerOutage,
  onToggleSimulatedPowerOutage,
  missingSourceDemo,
  onToggleMissingSource,
  waterAnomalyDemo,
  onToggleWaterAnomaly,
  onStartScenario,
}: {
  isOpen: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  simulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  simulatedPowerOutage: boolean;
  onToggleSimulatedPowerOutage: () => void;
  missingSourceDemo: boolean;
  onToggleMissingSource: () => void;
  waterAnomalyDemo: boolean;
  onToggleWaterAnomaly: () => void;
  onStartScenario: (playbookId: PlaybookId) => void;
}) {
  const activeSimCount = [
    simulatedOffline,
    simulatedPowerOutage,
    missingSourceDemo,
    waterAnomalyDemo,
  ].filter(Boolean).length;

  return (
    <div className="print:hidden">
      {/* Sağ Alt Küçük "Demo" Düğmesi */}
      <button
        type="button"
        data-testid="toggle-demo-panel-btn"
        aria-label="Demo Kontrol Çekmecesini Aç veya Kapat"
        onClick={onToggleOpen}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border-2 border-purple-300 bg-purple-900 px-3.5 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <Sliders className="h-4 w-4" />
        <span>Demo</span>
        {activeSimCount > 0 && (
          <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[11px] font-extrabold text-slate-950">
            {activeSimCount}
          </span>
        )}
      </button>

      {/* Sağ Yan Çekmece (Drawer) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Yarı saydam arka plan */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={onClose}
            aria-hidden="true"
          />

          <aside
            aria-label="Demo Kontrol Paneli"
            data-testid="demo-control-panel"
            className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l-2 border-purple-400 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Sliders className="h-5 w-5 text-purple-700" />
                  <h2 className="text-base font-bold text-slate-950">
                    Demo Kontrol Çekmecesi
                  </h2>
                  <span className="rounded bg-purple-700 px-2 py-0.5 text-[11px] font-bold text-white">
                    SİMÜLASYON
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">
                  Bu çekmece yalnızca sunum ve test içindir. Gerçek donanımı
                  etkilemez; ARK-OS karar destek tepkilerini göstermek için{' '}
                  <strong>simülasyon durumunu</strong> değiştirir.
                </p>
              </div>

              <button
                type="button"
                data-testid="close-demo-panel-btn"
                aria-label="Demo çekmecesini kapat"
                onClick={onClose}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
                Kapat
              </button>
            </div>

            {/* KURAL #6: ELEKTRİK KESİNTİSİ DÜRÜSTLÜK BİLDİRİMİ */}
            <div
              data-testid="power-outage-honesty-notice"
              className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-400 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-950"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <strong>
                  Önemli Dürüstlük Notu (Elektrik Kesintisi Simülasyonu):
                </strong>{' '}
                &ldquo;Elektriği kes&rdquo; butonu gerçek bir elektrik kesintisi
                yaratmaz; yalnızca uygulamanın simülasyon durumunu değiştirir.{' '}
                <strong>
                  Gerçek bir elektrik kesintisinde bu panelin çalışabilmesi için
                  kullanılan cihazın (bilgisayar/tablet) ve yerel ağın
                  (modem/switch) kesintisiz güç kaynağına (UPS / yedek batarya)
                  bağlı olması gerekir.
                </strong>
              </div>
            </div>

            {/* DEMO KONTROL BUTONLARI */}
            <div className="mt-4 space-y-2.5">
              {/* 1. İnterneti Kes */}
              <button
                type="button"
                data-testid="demo-btn-internet"
                onClick={onToggleSimulatedOffline}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm font-bold transition ${
                  simulatedOffline
                    ? 'border-red-600 bg-red-600 text-white shadow-sm'
                    : 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-purple-50'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <WifiOff className="h-4 w-4 shrink-0" />
                  <span>
                    1.{' '}
                    {simulatedOffline
                      ? 'İnterneti Geri Aç (Simülasyon)'
                      : 'İnterneti Kes'}
                  </span>
                </span>
                <span className="rounded bg-black/15 px-2 py-0.5 text-xs">
                  {simulatedOffline ? 'Kesik' : 'Açık'}
                </span>
              </button>

              {/* 2. Elektriği Kes */}
              <button
                type="button"
                data-testid="demo-btn-power"
                onClick={onToggleSimulatedPowerOutage}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm font-bold transition ${
                  simulatedPowerOutage
                    ? 'border-red-600 bg-red-600 text-white shadow-sm'
                    : 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-purple-50'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <PowerOff className="h-4 w-4 shrink-0" />
                  <span>
                    2.{' '}
                    {simulatedPowerOutage
                      ? 'Elektriği Geri Ver (Simülasyon)'
                      : 'Elektriği Kes'}
                  </span>
                </span>
                <span className="rounded bg-black/15 px-2 py-0.5 text-xs">
                  {simulatedPowerOutage ? 'Kesinti Simülasyonu' : 'Şebeke Normal'}
                </span>
              </button>

              {/* 3. Bir Veri Kaynağını Kapat */}
              <button
                type="button"
                data-testid="demo-btn-datasource"
                onClick={onToggleMissingSource}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm font-bold transition ${
                  missingSourceDemo
                    ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                    : 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-purple-50'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Unplug className="h-4 w-4 shrink-0" />
                  <span>
                    3.{' '}
                    {missingSourceDemo
                      ? 'Veri Kaynağını Aç (GES)'
                      : 'Bir Veri Kaynağını Kapat'}
                  </span>
                </span>
                <span className="rounded bg-black/15 px-2 py-0.5 text-xs">
                  {missingSourceDemo ? 'Veri Yok' : 'Aktif'}
                </span>
              </button>

              {/* 4. Su Farkı Üret */}
              <button
                type="button"
                data-testid="demo-btn-water-diff"
                onClick={onToggleWaterAnomaly}
                className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-sm font-bold transition ${
                  waterAnomalyDemo
                    ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                    : 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-purple-50'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Droplets className="h-4 w-4 shrink-0" />
                  <span>
                    4.{' '}
                    {waterAnomalyDemo
                      ? 'Su Farkını Normale Döndür'
                      : 'Su Farkı Üret'}
                  </span>
                </span>
                <span className="rounded bg-black/15 px-2 py-0.5 text-xs">
                  {waterAnomalyDemo ? 'Anomali Aktif' : 'Normal'}
                </span>
              </button>

              {/* 5A. Senaryo Başlat (Aşırı Sıcak) */}
              <button
                type="button"
                data-testid="demo-btn-scenario-heat"
                onClick={() => onStartScenario('heatwave')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-left text-sm font-bold text-slate-900 transition hover:bg-orange-50"
              >
                <span className="flex items-center gap-2.5">
                  <Sun className="h-4 w-4 shrink-0 text-orange-600" />
                  <span>5A. Senaryo Başlat (Aşırı Sıcak)</span>
                </span>
                <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-950">
                  Playbook Aç
                </span>
              </button>

              {/* 5B. Senaryo Başlat (Ani Sağanak / Sel) */}
              <button
                type="button"
                data-testid="demo-btn-scenario-flood"
                onClick={() => onStartScenario('flash_flood')}
                className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-left text-sm font-bold text-slate-900 transition hover:bg-blue-50"
              >
                <span className="flex items-center gap-2.5">
                  <CloudRain className="h-4 w-4 shrink-0 text-blue-600" />
                  <span>5B. Senaryo Başlat (Ani Sağanak / Sel)</span>
                </span>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-950">
                  Playbook Aç
                </span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default DemoControlPanel;
