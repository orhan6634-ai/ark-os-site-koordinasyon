import React from 'react';
import {
  AlertTriangle,
  CloudRain,
  Droplets,
  EyeOff,
  PowerOff,
  Sliders,
  Sun,
  Unplug,
  WifiOff,
} from 'lucide-react';
import { PlaybookId } from '../types';

export function DemoControlPanel({
  isOpen,
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
  if (!isOpen) return null;

  return (
    <section
      aria-label="Demo Kontrol Paneli"
      data-testid="demo-control-panel"
      className="rounded-xl border-2 border-purple-400 bg-purple-50/90 p-4 shadow-md print:hidden"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-purple-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-purple-700" />
            <h2 className="text-base font-bold text-purple-950 sm:text-lg">
              Demo Kontrol Paneli (Yalnızca Sunum ve Gösterim İçindir)
            </h2>
            <span className="rounded bg-purple-700 px-2 py-0.5 text-[11px] font-bold text-white">
              GİZLİ DEMO SAYFASI
            </span>
          </div>
          <p className="mt-1 text-xs text-purple-900">
            Bu panel üretim ortamında varsayılan olarak kapalıdır. Aşağıdaki butonlar
            gerçek donanımı etkilemez; yalnızca ARK-OS karar destek tepkilerini
            göstermek için <strong>simülasyon durumunu</strong> değiştirir.
          </p>
        </div>

        <button
          type="button"
          data-testid="close-demo-panel-btn"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-lg border border-purple-300 bg-white px-2.5 py-1 text-xs font-semibold text-purple-900 hover:bg-purple-100"
        >
          <EyeOff className="h-3.5 w-3.5" />
          Demo Panelini Gizle
        </button>
      </div>

      {/* KURAL #6: ELEKTRİK KESİNTİSİ DÜRÜSTLÜK BİLDİRİMİ */}
      <div
        data-testid="power-outage-honesty-notice"
        className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div>
          <strong>Önemli Dürüstlük Notu (Elektrik Kesintisi Simülasyonu):</strong>{' '}
          &ldquo;Elektriği kes&rdquo; butonu gerçek bir elektrik kesintisi yaratmaz;
          yalnızca uygulamanın simülasyon durumunu (şebeke enerjisi = 0 kW, Kriz Modu,
          batarya/jeneratör devrede) değiştirir.{' '}
          <strong>
            Gerçek bir elektrik kesintisinde bu panelin çalışabilmesi için kullanılan
            cihazın (bilgisayar/tablet) ve yerel ağın (modem/switch) kesintisiz güç
            kaynağına (UPS / yedek batarya) bağlı olması gerekir.
          </strong>
        </div>
      </div>

      {/* DEMO KONTROL BUTONLARI */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1. İnterneti Kes */}
        <button
          type="button"
          data-testid="demo-btn-internet"
          onClick={onToggleSimulatedOffline}
          className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-bold transition ${
            simulatedOffline
              ? 'border-red-500 bg-red-600 text-white shadow-sm'
              : 'border-purple-200 bg-white text-slate-900 hover:bg-purple-100/60'
          }`}
        >
          <span className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>
              1. {simulatedOffline ? 'İnterneti Geri Aç (Simülasyon)' : 'İnterneti Kes'}
            </span>
          </span>
          <span className="rounded bg-black/10 px-2 py-0.5 text-[10px]">
            {simulatedOffline ? 'Kesik' : 'Açık'}
          </span>
        </button>

        {/* 2. Elektriği Kes */}
        <button
          type="button"
          data-testid="demo-btn-power"
          onClick={onToggleSimulatedPowerOutage}
          className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-bold transition ${
            simulatedPowerOutage
              ? 'border-red-500 bg-red-600 text-white shadow-sm'
              : 'border-purple-200 bg-white text-slate-900 hover:bg-purple-100/60'
          }`}
        >
          <span className="flex items-center gap-2">
            <PowerOff className="h-4 w-4 shrink-0" />
            <span>
              2. {simulatedPowerOutage ? 'Elektriği Geri Ver (Simülasyon)' : 'Elektriği Kes'}
            </span>
          </span>
          <span className="rounded bg-black/10 px-2 py-0.5 text-[10px]">
            {simulatedPowerOutage ? 'Kesinti Simülasyonu' : 'Şebeke Normal'}
          </span>
        </button>

        {/* 3. Bir Veri Kaynağını Kapat */}
        <button
          type="button"
          data-testid="demo-btn-datasource"
          onClick={onToggleMissingSource}
          className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-bold transition ${
            missingSourceDemo
              ? 'border-amber-500 bg-amber-600 text-white shadow-sm'
              : 'border-purple-200 bg-white text-slate-900 hover:bg-purple-100/60'
          }`}
        >
          <span className="flex items-center gap-2">
            <Unplug className="h-4 w-4 shrink-0" />
            <span>
              3.{' '}
              {missingSourceDemo
                ? 'Veri Kaynağını Aç (GES)'
                : 'Bir Veri Kaynağını Kapat'}
            </span>
          </span>
          <span className="rounded bg-black/10 px-2 py-0.5 text-[10px]">
            {missingSourceDemo ? 'Veri Yok' : 'Aktif'}
          </span>
        </button>

        {/* 4. Su Farkı Üret */}
        <button
          type="button"
          data-testid="demo-btn-water-diff"
          onClick={onToggleWaterAnomaly}
          className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-bold transition ${
            waterAnomalyDemo
              ? 'border-amber-500 bg-amber-600 text-white shadow-sm'
              : 'border-purple-200 bg-white text-slate-900 hover:bg-purple-100/60'
          }`}
        >
          <span className="flex items-center gap-2">
            <Droplets className="h-4 w-4 shrink-0" />
            <span>
              4. {waterAnomalyDemo ? 'Su Farkını Normale Döndür' : 'Su Farkı Üret'}
            </span>
          </span>
          <span className="rounded bg-black/10 px-2 py-0.5 text-[10px]">
            {waterAnomalyDemo ? 'Anomali Aktif' : 'Normal'}
          </span>
        </button>

        {/* 5A. Senaryo Başlat (Aşırı Sıcak) */}
        <button
          type="button"
          data-testid="demo-btn-scenario-heat"
          onClick={() => onStartScenario('heatwave')}
          className="flex items-center justify-between rounded-xl border border-purple-200 bg-white p-3 text-left text-xs font-bold text-slate-900 transition hover:bg-orange-50"
        >
          <span className="flex items-center gap-2">
            <Sun className="h-4 w-4 shrink-0 text-orange-600" />
            <span>5A. Senaryo Başlat (Aşırı Sıcak)</span>
          </span>
          <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] text-orange-900">
            Playbook Aç
          </span>
        </button>

        {/* 5B. Senaryo Başlat (Ani Sağanak / Sel) */}
        <button
          type="button"
          data-testid="demo-btn-scenario-flood"
          onClick={() => onStartScenario('flash_flood')}
          className="flex items-center justify-between rounded-xl border border-purple-200 bg-white p-3 text-left text-xs font-bold text-slate-900 transition hover:bg-blue-50"
        >
          <span className="flex items-center gap-2">
            <CloudRain className="h-4 w-4 shrink-0 text-blue-600" />
            <span>5B. Senaryo Başlat (Ani Sağanak / Sel)</span>
          </span>
          <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] text-blue-900">
            Playbook Aç
          </span>
        </button>
      </div>
    </section>
  );
}

export default DemoControlPanel;
