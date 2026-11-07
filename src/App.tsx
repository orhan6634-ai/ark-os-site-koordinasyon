import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  Clock,
  Droplets,
  HelpCircle,
  RefreshCw,
  ShieldAlert,
  Sliders,
  Sun,
  Wifi,
  WifiOff,
  Wrench,
  Zap,
} from 'lucide-react';
import { createInitialSnapshot } from './data/syntheticData';
import { IncidentSection } from './components/IncidentSection';
import { WaterAnomalyBanner } from './components/WaterAnomalyBanner';
import { PlaybookSection } from './components/PlaybookSection';
import { DemoControlPanel } from './components/DemoControlPanel';
import { AfterActionReportSection } from './components/AfterActionReportSection';
import { ensureInitialIncidents } from './db/localDb';
import {
  syncLocalIncidentsToServer,
  SyncResultSummary,
} from './services/syncService';
import {
  ConnectionState,
  DashboardSnapshot,
  DataStatus,
  MaintenanceTask,
  MetricReading,
  PlaybookId,
  SystemMode,
} from './types';

function StatusBadge({ status }: { status: DataStatus }) {
  if (status === 'missing') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        <AlertTriangle className="h-3 w-3" />
        Veri yok
      </span>
    );
  }
  if (status === 'stale') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        <Clock className="h-3 w-3" />
        Eski veri
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      <CheckCircle2 className="h-3 w-3" />
      Güncel
    </span>
  );
}

function MetricCard({
  reading,
  icon,
  highlight = false,
}: {
  reading: MetricReading<number | string>;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  const isMissing = reading.status === 'missing' || reading.value === null;

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition-colors ${
        highlight
          ? 'border-amber-400 bg-amber-50/60'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-700">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-700">{icon}</div>
          <span className="text-sm font-semibold">{reading.label}</span>
        </div>
        <StatusBadge status={reading.status} />
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        {isMissing ? (
          <span className="text-lg font-bold text-red-700">Veri Yok (Okunamadı)</span>
        ) : (
          <>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {reading.value}
            </span>
            {reading.unit && (
              <span className="text-sm font-medium text-slate-600">{reading.unit}</span>
            )}
          </>
        )}
      </div>

      {reading.note && (
        <p className="mt-1.5 text-xs text-slate-600">{reading.note}</p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          Son güncelleme:{' '}
          <strong className="font-medium text-slate-700">
            {reading.updatedAt ?? 'Bilinmiyor'}
          </strong>
        </span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
          Örnek veri
        </span>
      </div>
    </div>
  );
}

export function App() {
  const [mode, setMode] = useState<SystemMode>('normal');
  const [connection, setConnection] = useState<ConnectionState>(
    navigator.onLine ? 'online' : 'offline'
  );
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(() =>
    createInitialSnapshot()
  );
  const [missingSourceDemo, setMissingSourceDemo] = useState<boolean>(false);
  const [waterAnomalyDemo, setWaterAnomalyDemo] = useState<boolean>(false);
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const [simulatedPowerOutage, setSimulatedPowerOutage] =
    useState<boolean>(false);
  const [activePlaybookId, setActivePlaybookId] =
    useState<PlaybookId | null>(null);
  const [isDemoPanelOpen, setIsDemoPanelOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.search.includes('demo=1') ||
      window.location.hash === '#demo'
    );
  });
  const [lastSyncResult, setLastSyncResult] =
    useState<SyncResultSummary | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncRefreshToken, setSyncRefreshToken] = useState<number>(0);

  const runSync = async (forceAllowWhenSimulatedEnded = false) => {
    if (
      !navigator.onLine ||
      (simulatedOffline && !forceAllowWhenSimulatedEnded)
    ) {
      setConnection('offline');
      return;
    }
    setConnection('syncing');
    setSyncError(null);
    try {
      await ensureInitialIncidents();
      const summary = await syncLocalIncidentsToServer();
      setLastSyncResult(summary);
      setConnection('online');
      setSyncRefreshToken((prev) => prev + 1);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Sahte sunucuya bağlantı kurulamadı.';
      setSyncError(msg);
      setConnection(
        navigator.onLine && !simulatedOffline ? 'online' : 'offline'
      );
    }
  };

  useEffect(() => {
    if (navigator.onLine) {
      void runSync();
    }
    const handleOnline = () => {
      void runSync();
    };
    const handleOffline = () => setConnection('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRefreshSyntheticData = () => {
    const fresh = createInitialSnapshot();
    if (missingSourceDemo) {
      fresh.electricity.solarGenerationKw = {
        ...fresh.electricity.solarGenerationKw,
        value: null,
        updatedAt: null,
        status: 'missing',
        note: 'Veri kaynağı yanıt vermiyor (Simüle edilmiş eksik veri)',
      };
    }
    if (waterAnomalyDemo) {
      fresh.water.mainMeterM3 = {
        ...fresh.water.mainMeterM3,
        value: 82.6,
        note: 'Ana sayaçta olağandışı artış (Simüle edilmiş su farkı)',
      };
    }
    setSnapshot(fresh);
  };

  const toggleWaterAnomalySimulation = () => {
    const next = !waterAnomalyDemo;
    setWaterAnomalyDemo(next);
    setSnapshot((prev) => ({
      ...prev,
      water: {
        ...prev.water,
        mainMeterM3: next
          ? {
              ...prev.water.mainMeterM3,
              value: 82.6,
              updatedAt: new Date().toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
              note: 'Ana sayaçta olağandışı artış (Simüle edilmiş su farkı)',
            }
          : createInitialSnapshot().water.mainMeterM3,
      },
    }));
  };

  const handlePlaybookStepRecorded = async () => {
    setSyncRefreshToken((prev) => prev + 1);
    if (navigator.onLine && !simulatedOffline) {
      await runSync();
    }
  };

  const toggleSimulatedOffline = () => {
    const next = !simulatedOffline;
    setSimulatedOffline(next);
    if (next) {
      setConnection('offline');
    } else if (navigator.onLine) {
      void runSync(true);
    }
  };

  const toggleSimulatedPowerOutage = () => {
    const next = !simulatedPowerOutage;
    setSimulatedPowerOutage(next);
    const nowTime = new Date().toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    if (next) {
      setMode('crisis');
      setActivePlaybookId('long_power_outage');
      setSnapshot((prev) => ({
        ...prev,
        electricity: {
          ...prev.electricity,
          gridConsumptionKw: {
            ...prev.electricity.gridConsumptionKw,
            value: 0,
            updatedAt: nowTime,
            note: 'Şebeke elektriği kesik (Simülasyon durumu — gerçek kesinti değildir)',
          },
          generatorStatus: {
            ...prev.electricity.generatorStatus,
            value: 'Devrede — Kritik Yükleri Besliyor (Simülasyon)',
            updatedAt: nowTime,
            status: 'ok',
            note: 'Simülasyon: Jeneratör otomatik devreye alındı',
          },
        },
      }));
    } else {
      const defaults = createInitialSnapshot();
      setSnapshot((prev) => ({
        ...prev,
        electricity: {
          ...prev.electricity,
          gridConsumptionKw: defaults.electricity.gridConsumptionKw,
          generatorStatus: defaults.electricity.generatorStatus,
        },
      }));
    }
  };

  const handleStartDemoScenario = (playbookId: PlaybookId) => {
    setMode('crisis');
    setActivePlaybookId(playbookId);
  };

  const toggleMissingDataExample = () => {
    const next = !missingSourceDemo;
    setMissingSourceDemo(next);
    setSnapshot((prev) => ({
      ...prev,
      electricity: {
        ...prev.electricity,
        solarGenerationKw: next
          ? {
              ...prev.electricity.solarGenerationKw,
              value: null,
              updatedAt: null,
              status: 'missing',
              note: 'GES inverter bağlantısı yok — Veri alınamıyor (Simülasyon)',
            }
          : createInitialSnapshot().electricity.solarGenerationKw,
      },
    }));
  };

  const modeConfig: Record<
    SystemMode,
    {
      title: string;
      badgeClass: string;
      bannerClass: string;
      description: string;
      priorityNote: string;
    }
  > = {
    normal: {
      title: '1. Normal Mod (Günlük Operasyon)',
      badgeClass: 'bg-emerald-600 text-white',
      bannerClass: 'border-emerald-200 bg-emerald-50 text-emerald-950',
      description:
        'Günlük su/enerji tüketimi ve rutin bakım işleri izleniyor. Tüm göstergeler standart düzende listelenir.',
      priorityNote:
        'Öncelik: Su/elektrik sayaç takibi ve planlı bakım listesi.',
    },
    crisis: {
      title: '2. Kriz / Kesinti Modu (Yerel Panel Öncelikli)',
      badgeClass: 'bg-red-600 text-white',
      bannerClass: 'border-red-300 bg-red-50 text-red-950',
      description:
        'Kesinti veya acil durumda kritik rezervler (Su Deposu Seviyesi, Yedek Batarya, Jeneratör) ve acil bakım işleri en üste taşınır.',
      priorityNote:
        'Öncelik: Kritik su/enerji rezervleri ve Yüksek öncelikli arıza müdahaleleri.',
    },
    recovery: {
      title: '3. İyileşme Modu (Normale Dönüş ve Açık İş Takibi)',
      badgeClass: 'bg-amber-600 text-white',
      bannerClass: 'border-amber-300 bg-amber-50 text-amber-950',
      description:
        'Kesinti sonrası bekleyen/devam eden bakım işleri ve eskiyen sayaç okumalarının güncellenmesi önceliklendirilir.',
      priorityNote:
        'Öncelik: Tamamlanmamış açık bakım işleri ve veri güncelliği kontrolü.',
    },
  };

  const currentModeInfo = modeConfig[mode];

  // Üç modda ekran farklı önceliklerle değişir:
  // Kriz modunda yalnızca bekleyen/devam eden yüksek öncelikli işler en üstte vurgulanır;
  // İyileşme modunda açık (Bekliyor / Devam Ediyor) işler tamamlananların önüne alınır.
  const sortedMaintenanceTasks: MaintenanceTask[] = [...snapshot.maintenanceTasks].sort(
    (a, b) => {
      if (mode === 'crisis') {
        const prioScore = { Yüksek: 3, Orta: 2, Düşük: 1 };
        return prioScore[b.priority] - prioScore[a.priority];
      }
      if (mode === 'recovery') {
        const statusScore = { 'Devam Ediyor': 3, Bekliyor: 2, Tamamlandı: 1 };
        return statusScore[b.status] - statusScore[a.status];
      }
      return 0;
    }
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ÜST ÇUBUK (Mod, Bağlantı Durumu ve Örnek Veri Etiketi) */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 font-bold text-white">
              ARK
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                  ARK-OS Site Koordinasyon Paneli
                </h1>
                <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                  Örnek veri (Sensör simülasyonu)
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {snapshot.siteName} • {snapshot.blockCount} Blok,{' '}
                {snapshot.unitCount} Daire
              </p>
            </div>
          </div>

          {/* Üst Çubuk Durum Göstergeleri */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Aktif Mod Rozeti */}
            <span
              data-testid="active-mode-badge"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${currentModeInfo.badgeClass}`}
            >
              <Activity className="h-3.5 w-3.5" />
              {currentModeInfo.title}
            </span>

            {/* Bağlantı Durumu Rozeti */}
            <div
              data-testid="connection-status-badge"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                connection === 'online'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : connection === 'syncing'
                  ? 'border-blue-300 bg-blue-50 text-blue-800'
                  : 'border-red-300 bg-red-50 text-red-800'
              }`}
            >
              {connection === 'online' && (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                  Çevrimiçi
                  {lastSyncResult && !syncError && (
                    <span
                      data-testid="header-synced-pill"
                      className="ml-1 rounded bg-emerald-200/80 px-1.5 py-0.5 text-[11px] font-bold text-emerald-950"
                    >
                      • Senkronize edildi
                    </span>
                  )}
                </>
              )}
              {connection === 'offline' && (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-red-600" />
                  Çevrimdışı (Yerel Mod)
                </>
              )}
              {connection === 'syncing' && (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  Senkronize ediliyor
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mod Seçim Çubuğu ve Hızlı Kontroller */}
        <div className="border-t border-slate-100 bg-slate-100/80 px-4 py-2">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-semibold text-slate-600">
                Çalışma Modu Seçin:
              </span>
              <button
                type="button"
                onClick={() => setMode('normal')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  mode === 'normal'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                Normal Mod
              </button>
              <button
                type="button"
                onClick={() => setMode('crisis')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  mode === 'crisis'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                Kriz / Kesinti Modu
              </button>
              <button
                type="button"
                onClick={() => setMode('recovery')}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  mode === 'recovery'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-200'
                }`}
              >
                İyileşme Modu
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleMissingDataExample}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                {missingSourceDemo
                  ? 'Eksik Veri Örneğini Kapat'
                  : 'Eksik Veri ("Veri Yok") Örneğini Göster'}
              </button>
              <button
                type="button"
                onClick={handleRefreshSyntheticData}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                Örnek Verileri Yenile
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ANA İÇERİK */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* GİZLİ DEMO KONTROL PANELİ (Varsayılan olarak kapalıdır; ?demo=1 veya alt çubuktan açılır) */}
        <DemoControlPanel
          isOpen={isDemoPanelOpen}
          onClose={() => setIsDemoPanelOpen(false)}
          simulatedOffline={simulatedOffline}
          onToggleSimulatedOffline={toggleSimulatedOffline}
          simulatedPowerOutage={simulatedPowerOutage}
          onToggleSimulatedPowerOutage={toggleSimulatedPowerOutage}
          missingSourceDemo={missingSourceDemo}
          onToggleMissingSource={toggleMissingDataExample}
          waterAnomalyDemo={waterAnomalyDemo}
          onToggleWaterAnomaly={toggleWaterAnomalySimulation}
          onStartScenario={handleStartDemoScenario}
        />

        {/* Dürüstlük ve Kapsam Sınırı Bildirimi */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-700 shadow-sm">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            <div>
              <span className="font-bold text-slate-900">
                Sistem Kapsamı ve Dürüstlük Bildirimi:
              </span>{' '}
              ARK-OS bir karar destek ve site içi koordinasyon aracıdır.{' '}
              <strong>
                Yapısal güvenlik analizi, tahliye emri veya arama-kurtarma sistemi
                DEĞİLDİR.
              </strong>{' '}
              Gerçek sensör bağlı değildir; ekrandaki tüm sayaç ve durum bilgileri{' '}
              <span className="underline">sentetik örnek veridir</span>.
            </div>
          </div>
        </div>

        {/* Aktif Mod Bilgi ve Öncelik Kutusu */}
        <section
          aria-label="Aktif Mod Özeti"
          className={`rounded-xl border p-4 ${currentModeInfo.bannerClass}`}
        >
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-bold sm:text-base">
                {currentModeInfo.title}
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm">
                {currentModeInfo.description}
              </p>
            </div>
            <div className="shrink-0 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm">
              {currentModeInfo.priorityNote}
            </div>
          </div>
        </section>

        {/* KRİZ MODUNDA EN ÜSTE ÇIKAN KRİTİK REZERV ÖZETİ */}
        {mode === 'crisis' && (
          <section className="rounded-xl border-2 border-red-300 bg-red-50/70 p-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-red-900">
              <AlertTriangle className="h-5 w-5 text-red-700" />
              Kriz / Kesinti Modu — Kritik Rezerv ve Yedek Güç Durumu
            </h2>
            <p className="mt-1 text-xs text-red-800">
              Kesinti durumunda site yönetimi için en kritik 3 gösterge (Su Deposu,
              Yedek Batarya ve Jeneratör) öncelikli olarak aşağıda vurgulanmıştır:
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard
                reading={snapshot.water.tankLevelPct}
                icon={<Droplets className="h-5 w-5 text-blue-600" />}
                highlight
              />
              <MetricCard
                reading={snapshot.electricity.batterySocPct}
                icon={<BatteryCharging className="h-5 w-5 text-emerald-600" />}
                highlight
              />
              <MetricCard
                reading={snapshot.electricity.generatorStatus}
                icon={<Zap className="h-5 w-5 text-amber-600" />}
                highlight
              />
            </div>
          </section>
        )}

        {/* İYİLEŞME MODUNDA BAKIM İŞLERİ VE ESKİ VERİLER EN ÜSTE ÇIKAR */}
        {mode === 'recovery' && (
          <section className="rounded-xl border-2 border-amber-300 bg-amber-50/70 p-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-amber-950">
              <RefreshCw className="h-5 w-5 text-amber-700" />
              İyileşme Modu — Açık İşler ve Veri Güncelliği Takibi
            </h2>
            <p className="mt-1 text-xs text-amber-900">
              Kesinti sonrası normale dönüş sürecinde bekleyen/devam eden bakım işleri
              ve güncellenmesi gereken eski okumalar önceliklendirilmiştir.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <div className="rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold text-slate-800">
                Açık Bakım İşi Sayısı:{' '}
                <span className="text-amber-700">
                  {
                    snapshot.maintenanceTasks.filter(
                      (t) => t.status !== 'Tamamlandı'
                    ).length
                  }{' '}
                  adet
                </span>
              </div>
              <div className="rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold text-slate-800">
                Eski / Eksik Okuma Sayısı:{' '}
                <span className="text-red-700">
                  {
                    [
                      snapshot.water.mainMeterM3,
                      snapshot.water.apartmentsTotalM3,
                      snapshot.water.tankLevelPct,
                      snapshot.electricity.gridConsumptionKw,
                      snapshot.electricity.solarGenerationKw,
                      snapshot.electricity.batterySocPct,
                      snapshot.electricity.generatorStatus,
                    ].filter((r) => r.status !== 'ok').length
                  }{' '}
                  gösterge
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Kriz modunda Oyun Planları (Playbook) en üstte hızlı erişime açılır */}
        {mode === 'crisis' && (
          <PlaybookSection
            isOffline={connection === 'offline'}
            onStepRecorded={handlePlaybookStepRecorded}
            externalSelectedPlaybookId={activePlaybookId}
          />
        )}

        {/* Kriz ve İyileşme modlarında Olay ve İhtiyaç Kaydı öncelikli olarak üstte yer alır */}
        {(mode === 'crisis' || mode === 'recovery') && (
          <IncidentSection
            mode={mode}
            isOffline={connection === 'offline'}
            isSyncing={connection === 'syncing'}
            lastSyncResult={lastSyncResult}
            syncError={syncError}
            onTriggerSync={() => runSync()}
            syncRefreshToken={syncRefreshToken}
          />
        )}

        {/* 1. SU GÖSTERGELERİ PANELİ */}
        <section aria-label="Su Göstergeleri">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
              <Droplets className="h-5 w-5 text-blue-600" />
              Su Yönetimi Göstergeleri
            </h2>
            <span className="text-xs font-medium text-slate-500">
              Ana Sayaç • Daireler Toplamı • Depo Seviyesi
            </span>
          </div>

          <WaterAnomalyBanner
            mainMeterM3={snapshot.water.mainMeterM3.value}
            apartmentsTotalM3={snapshot.water.apartmentsTotalM3.value}
            isSimulatedAnomaly={waterAnomalyDemo}
            onToggleSimulateAnomaly={toggleWaterAnomalySimulation}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard
              reading={snapshot.water.mainMeterM3}
              icon={<Droplets className="h-5 w-5 text-blue-600" />}
            />
            <MetricCard
              reading={snapshot.water.apartmentsTotalM3}
              icon={<Droplets className="h-5 w-5 text-sky-600" />}
            />
            <MetricCard
              reading={snapshot.water.tankLevelPct}
              icon={<Droplets className="h-5 w-5 text-indigo-600" />}
              highlight={mode === 'crisis'}
            />
          </div>
        </section>

        {/* 2. ELEKTRİK VE ENERJİ GÖSTERGELERİ PANELİ */}
        <section aria-label="Elektrik Göstergeleri">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
              <Zap className="h-5 w-5 text-amber-600" />
              Elektrik ve Yedek Enerji Göstergeleri
            </h2>
            <span className="text-xs font-medium text-slate-500">
              Tüketim • GES Üretimi • Batarya • Jeneratör
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              reading={snapshot.electricity.gridConsumptionKw}
              icon={<Zap className="h-5 w-5 text-amber-600" />}
            />
            <MetricCard
              reading={snapshot.electricity.solarGenerationKw}
              icon={<Sun className="h-5 w-5 text-orange-500" />}
            />
            <MetricCard
              reading={snapshot.electricity.batterySocPct}
              icon={<BatteryCharging className="h-5 w-5 text-emerald-600" />}
              highlight={mode === 'crisis'}
            />
            <MetricCard
              reading={snapshot.electricity.generatorStatus}
              icon={<Zap className="h-5 w-5 text-slate-700" />}
              highlight={mode === 'crisis' || mode === 'recovery'}
            />
          </div>
        </section>

        {/* 3. BAKIM İŞLERİ PANELİ */}
        <section
          aria-label="Bakım İşleri"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
                <Wrench className="h-5 w-5 text-slate-700" />
                Teknik Bakım ve Kontrol İşleri
              </h2>
              <p className="text-xs text-slate-600">
                {mode === 'crisis'
                  ? 'Kriz modunda yüksek öncelikli teknik işler en üstte sıralanır.'
                  : mode === 'recovery'
                  ? 'İyileşme modunda devam eden ve bekleyen açık işler en üstte sıralanır.'
                  : 'Normal modda günlük teknik bakım listesi görüntülenir.'}
              </p>
            </div>
            <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              Örnek veri ({sortedMaintenanceTasks.length} kayıt)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <th className="px-3 py-2.5">Kod / İş Tanımı</th>
                  <th className="px-3 py-2.5">Alan / Konum</th>
                  <th className="px-3 py-2.5">Kategori</th>
                  <th className="px-3 py-2.5">Öncelik</th>
                  <th className="px-3 py-2.5">Durum</th>
                  <th className="px-3 py-2.5">Son Güncelleme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedMaintenanceTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium text-slate-900">
                      <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                        {task.id}
                      </span>
                      {task.title}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {task.location}
                    </td>
                    <td className="px-3 py-3 text-xs font-medium text-slate-700">
                      {task.category}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                          task.priority === 'Yüksek'
                            ? 'bg-red-100 text-red-800'
                            : task.priority === 'Orta'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                          task.status === 'Tamamlandı'
                            ? 'bg-emerald-100 text-emerald-800'
                            : task.status === 'Devam Ediyor'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {task.updatedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Normal ve İyileşme modlarında Kriz Oyun Planları (Playbook) burada görüntülenir */}
        {mode !== 'crisis' && (
          <PlaybookSection
            isOffline={connection === 'offline'}
            onStepRecorded={handlePlaybookStepRecorded}
            externalSelectedPlaybookId={activePlaybookId}
          />
        )}

        {/* Normal modda Olay ve İhtiyaç Kaydı göstergelerin ve bakım tablosunun altında yer alır */}
        {mode === 'normal' && (
          <IncidentSection
            mode={mode}
            isOffline={connection === 'offline'}
            isSyncing={connection === 'syncing'}
            lastSyncResult={lastSyncResult}
            syncError={syncError}
            onTriggerSync={() => runSync()}
            syncRefreshToken={syncRefreshToken}
          />
        )}

        {/* AŞAMA 5: OLAY SONRASI RAPOR (Yazdırılabilir / Dışa Aktarılabilir Kronolojik Zaman Çizelgesi) */}
        <AfterActionReportSection
          siteName={snapshot.siteName}
          refreshToken={syncRefreshToken}
        />
      </main>

      {/* ALT BİLGİ ÇUBUĞU VE GİZLİ DEMO KONTROL PANELİ TETİKLEYİCİSİ */}
      <footer className="mt-8 border-t border-slate-200 bg-white py-4 text-xs text-slate-500 print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4">
          <div>
            <strong>ARK-OS MVP</strong> • Site İçi Karar Destek ve Kesinti Koordinasyon
            Prototipi (Gerçek sensör bağlı değildir; örnek veriyle çalışır)
          </div>
          <button
            type="button"
            data-testid="toggle-demo-panel-btn"
            onClick={() => {
              setIsDemoPanelOpen((prev) => !prev);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-100"
          >
            <Sliders className="h-3.5 w-3.5" />
            {isDemoPanelOpen
              ? 'Demo Kontrol Panelini Kapat'
              : 'Gizli Demo Kontrol Panelini Aç (Sunum İçin)'}
          </button>
        </div>
      </footer>
    </div>
  );
}
export default App;
