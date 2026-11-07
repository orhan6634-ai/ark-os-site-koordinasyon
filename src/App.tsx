import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Database,
  Droplets,
  HelpCircle,
  Info,
  LayoutDashboard,
  RefreshCw,
  ShieldAlert,
  Sun,
  Wifi,
  WifiOff,
  Wrench,
  Zap,
} from 'lucide-react';
import { createInitialSnapshot } from './data/syntheticData';
import { IncidentSection } from './components/IncidentSection';
import { WaterAnomalyBanner, WATER_DIFF_THRESHOLD_M3, WATER_DIFF_THRESHOLD_PCT } from './components/WaterAnomalyBanner';
import { PlaybookSection } from './components/PlaybookSection';
import { DemoControlPanel } from './components/DemoControlPanel';
import { AfterActionReportSection } from './components/AfterActionReportSection';
import { BackupPowerCard } from './components/BackupPowerCard';
import { LoadSheddingCard } from './components/LoadSheddingCard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AboutModal, ARK_OS_VERSION_NOTICE } from './components/AboutModal';
import { ensureInitialIncidents, getAllIncidents } from './db/localDb';
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

export type AppTab =
  | 'dashboard'
  | 'crisis_playbook'
  | 'incidents_report'
  | 'maintenance';

const TAB_STORAGE_KEY = 'ark_os_active_tab';

const VALID_TABS: AppTab[] = [
  'dashboard',
  'crisis_playbook',
  'incidents_report',
  'maintenance',
];

function getInitialTab(): AppTab {
  if (typeof window === 'undefined') return 'dashboard';
  const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
  if (saved && VALID_TABS.includes(saved as AppTab)) {
    return saved as AppTab;
  }
  return 'dashboard';
}

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
          ? 'border-2 border-amber-500 bg-amber-50/70'
          : 'border-slate-300 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-900">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-800">{icon}</div>
          <span className="text-sm font-bold sm:text-base">{reading.label}</span>
        </div>
        <StatusBadge status={reading.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-1.5">
        {isMissing ? (
          <span className="text-lg font-extrabold text-red-800">
            Veri Yok (Okunamadı)
          </span>
        ) : (
          <>
            <span className="text-2xl font-extrabold tracking-tight text-slate-950">
              {reading.value}
            </span>
            {reading.unit && (
              <span className="text-sm font-bold text-slate-700">
                {reading.unit}
              </span>
            )}
          </>
        )}
      </div>

      {reading.note && (
        <p className="mt-2 text-xs font-medium leading-relaxed text-slate-700 sm:text-sm">
          {reading.note}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-slate-200 pt-2.5 text-xs text-slate-700">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          Son güncelleme:{' '}
          <strong className="font-bold text-slate-900">
            {reading.updatedAt ?? 'Bilinmiyor'}
          </strong>
        </span>
        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-800">
          Örnek veri
        </span>
      </div>
    </div>
  );
}

function CrashTrigger({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) {
    throw new Error('Simüle edilmiş beklenmedik render hatası (ErrorBoundary testi)');
  }
  return null;
}

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(() => getInitialTab());
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [simulatedCrash, setSimulatedCrash] = useState<boolean>(false);
  const [mode, setMode] = useState<SystemMode>('normal');
  const [browserOnline, setBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [connection, setConnection] = useState<ConnectionState>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(() =>
    createInitialSnapshot()
  );
  const [missingSourceDemo, setMissingSourceDemo] = useState<boolean>(false);
  const [waterAnomalyDemo, setWaterAnomalyDemo] = useState<boolean>(false);
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const simulatedOfflineRef = useRef<boolean>(false);
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

  // Genel Durum özeti için yerel kayıt sayaçları ve ayarlanabilir su eşikleri
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [openIncidentCount, setOpenIncidentCount] = useState<number>(0);
  const [waterThresholdM3, setWaterThresholdM3] = useState<number>(
    WATER_DIFF_THRESHOLD_M3
  );
  const [waterThresholdPct, setWaterThresholdPct] = useState<number>(
    WATER_DIFF_THRESHOLD_PCT
  );

  const selectTab = (tab: AppTab) => {
    setActiveTab(tab);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      // ignore storage error
    }
  };

  const refreshIncidentCounts = async () => {
    try {
      await ensureInitialIncidents();
      const all = await getAllIncidents();
      setPendingSyncCount(
        all.filter((i) => i.syncStatus === 'pending' || i.syncStatus === 'failed')
          .length
      );
      setOpenIncidentCount(all.filter((i) => i.status !== 'Çözüldü').length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void refreshIncidentCounts();
  }, [syncRefreshToken]);

  const runSync = async (forceAllowWhenSimulatedEnded = false) => {
    const isRealOnline = navigator.onLine;
    setBrowserOnline(isRealOnline);
    const isSimOffline =
      simulatedOfflineRef.current && !forceAllowWhenSimulatedEnded;

    if (!isRealOnline || isSimOffline) {
      setConnection('offline');
      await refreshIncidentCounts();
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
          : 'Gönderilemedi, tekrar denenecek.';
      setSyncError(msg);
      setConnection(
        navigator.onLine && !simulatedOfflineRef.current ? 'online' : 'offline'
      );
      setSyncRefreshToken((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (navigator.onLine && !simulatedOfflineRef.current) {
      void runSync();
    } else {
      setConnection('offline');
      void refreshIncidentCounts();
    }
    const handleOnline = () => {
      setBrowserOnline(true);
      if (!simulatedOfflineRef.current) {
        void runSync(true);
      }
    };
    const handleOffline = () => {
      setBrowserOnline(false);
      setConnection('offline');
    };
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
    if (navigator.onLine && !simulatedOfflineRef.current) {
      await runSync();
    } else {
      await refreshIncidentCounts();
    }
  };

  const toggleSimulatedOffline = () => {
    const next = !simulatedOffline;
    simulatedOfflineRef.current = next;
    setSimulatedOffline(next);
    if (next || !navigator.onLine) {
      setConnection('offline');
    } else {
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
    selectTab('crisis_playbook');
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
      shortLabel: string;
      badgeClass: string;
      bannerClass: string;
      description: string;
      priorityNote: string;
    }
  > = {
    normal: {
      title: '[NORMAL] 1. Normal Mod (Günlük Operasyon)',
      shortLabel: '[NORMAL] NORMAL MOD',
      badgeClass: 'bg-emerald-700 text-white',
      bannerClass: 'border-emerald-300 bg-emerald-50 text-emerald-950',
      description:
        'Günlük su/enerji tüketimi ve rutin bakım işleri izleniyor. Tüm göstergeler standart düzende listelenir.',
      priorityNote:
        'Öncelik: Su/elektrik sayaç takibi ve planlı bakım listesi.',
    },
    crisis: {
      title: '[KRİZ] 2. Kriz / Kesinti Modu (Yerel Panel Öncelikli)',
      shortLabel: '[KRİZ] KRİZ / KESİNTİ MODU',
      badgeClass: 'bg-red-700 text-white',
      bannerClass: 'border-red-400 bg-red-50 text-red-950',
      description:
        'Kesinti veya acil durumda kritik rezervler (Su Deposu Seviyesi, Yedek Batarya, Jeneratör) ve acil müdahale adımları öne çıkarılır.',
      priorityNote:
        'Öncelik: Kritik su/enerji rezervleri ve Yüksek öncelikli arıza müdahaleleri.',
    },
    recovery: {
      title: '[İYİLEŞME] 3. İyileşme Modu (Normale Dönüş ve Açık İş Takibi)',
      shortLabel: '[İYİLEŞME] İYİLEŞME MODU',
      badgeClass: 'bg-amber-700 text-white',
      bannerClass: 'border-amber-400 bg-amber-50 text-amber-950',
      description:
        'Kesinti sonrası bekleyen/devam eden bakım işleri ve eskiyen sayaç okumalarının güncellenmesi önceliklendirilir.',
      priorityNote:
        'Öncelik: Tamamlanmamış açık bakım işleri ve veri güncelliği kontrolü.',
    },
  };

  const currentModeInfo = modeConfig[mode];

  // Su anomalisi ve eksik veri durumu hesaplama (Genel Durum 4. Kartı için)
  const mainWater = snapshot.water.mainMeterM3.value;
  const aptWater = snapshot.water.apartmentsTotalM3.value;
  const waterDiffM3 =
    mainWater !== null && aptWater !== null
      ? Number((mainWater - aptWater).toFixed(2))
      : 0;
  const waterDiffPct =
    mainWater && mainWater > 0
      ? Number(((waterDiffM3 / mainWater) * 100).toFixed(1))
      : 0;
  const hasWaterAnomaly =
    waterDiffM3 >= waterThresholdM3 || waterDiffPct >= waterThresholdPct;

  const missingReadingsCount = [
    snapshot.water.mainMeterM3,
    snapshot.water.apartmentsTotalM3,
    snapshot.water.tankLevelPct,
    snapshot.electricity.gridConsumptionKw,
    snapshot.electricity.solarGenerationKw,
    snapshot.electricity.batterySocPct,
    snapshot.electricity.generatorStatus,
  ].filter((r) => r.status === 'missing').length;

  const activeAnomalyCount =
    (hasWaterAnomaly ? 1 : 0) + (missingReadingsCount > 0 ? 1 : 0);

  const sortedMaintenanceTasks: MaintenanceTask[] = [
    ...snapshot.maintenanceTasks,
  ].sort((a, b) => {
    if (mode === 'crisis') {
      const prioScore = { Yüksek: 3, Orta: 2, Düşük: 1 };
      return prioScore[b.priority] - prioScore[a.priority];
    }
    if (mode === 'recovery') {
      const statusScore = { 'Devam Ediyor': 3, Bekliyor: 2, Tamamlandı: 1 };
      return statusScore[b.status] - statusScore[a.status];
    }
    return 0;
  });

  const navItems: {
    id: AppTab;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: string | number;
  }[] = [
    {
      id: 'dashboard',
      label: 'Gösterge Paneli',
      shortLabel: 'Gösterge Paneli',
      icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
      badge: activeAnomalyCount > 0 ? `${activeAnomalyCount} Uyarı` : undefined,
    },
    {
      id: 'crisis_playbook',
      label: 'Kriz ve Playbook',
      shortLabel: 'Kriz ve Playbook',
      icon: <BookOpen className="h-4 w-4 shrink-0" />,
      badge: mode === 'crisis' ? 'KRİZ' : undefined,
    },
    {
      id: 'incidents_report',
      label: 'Olay Kayıtları ve Rapor',
      shortLabel: 'Olay Kayıtları ve Rapor',
      icon: <ClipboardList className="h-4 w-4 shrink-0" />,
      badge: pendingSyncCount > 0 ? `${pendingSyncCount} Bekleyen` : openIncidentCount,
    },
    {
      id: 'maintenance',
      label: 'Teknik Bakım',
      shortLabel: 'Teknik Bakım',
      icon: <Wrench className="h-4 w-4 shrink-0" />,
      badge: snapshot.maintenanceTasks.filter((t) => t.status !== 'Tamamlandı')
        .length,
    },
  ];

  return (
    <ErrorBoundary onResetSimulatedCrash={() => setSimulatedCrash(false)}>
      <CrashTrigger shouldCrash={simulatedCrash} />
      <div className="min-h-screen overflow-x-hidden bg-slate-100 text-slate-950">
      {/* ÜST ÇUBUK */}
      <header className="sticky top-0 z-20 border-b border-slate-300 bg-white shadow-sm print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-extrabold text-white">
              ARK
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-extrabold text-slate-950 sm:text-lg">
                  ARK-OS Site Koordinasyon Paneli
                </h1>
                <span className="rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-950">
                  Örnek veri (Sensör simülasyonu)
                </span>
                <button
                  type="button"
                  data-testid="header-about-modal-btn"
                  onClick={() => setIsAboutModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-extrabold text-slate-900 transition hover:bg-indigo-100 hover:border-indigo-300"
                >
                  <Info className="h-3.5 w-3.5 text-indigo-700" />
                  Hakkında (v0.9)
                </button>
              </div>
              <p className="text-xs font-medium text-slate-700 sm:text-sm">
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
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold sm:text-sm ${currentModeInfo.badgeClass}`}
            >
              <Activity className="h-4 w-4 shrink-0" />
              {currentModeInfo.title}
            </span>

            {/* Bağlantı Durumu Rozeti */}
            <div
              data-testid="connection-status-badge"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-extrabold sm:text-sm ${
                connection === 'online'
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-950'
                  : connection === 'syncing'
                  ? 'border-blue-400 bg-blue-50 text-blue-950'
                  : 'border-red-400 bg-red-50 text-red-950'
              }`}
            >
              {connection === 'online' && (
                <>
                  <Wifi className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span>Çevrimiçi (Gerçek Ağ)</span>
                  {lastSyncResult && !syncError && (
                    <span
                      data-testid="header-synced-pill"
                      className="ml-1 rounded bg-emerald-200 px-1.5 py-0.5 text-xs font-extrabold text-emerald-950"
                    >
                      • Senkronize edildi
                    </span>
                  )}
                  {syncError && (
                    <span
                      data-testid="header-sync-failed-pill"
                      className="ml-1 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-extrabold text-amber-950"
                    >
                      • Gönderilemedi, tekrar denenecek
                    </span>
                  )}
                </>
              )}
              {connection === 'offline' && (
                <>
                  <WifiOff className="h-4 w-4 shrink-0 text-red-700" />
                  <span>
                    {!browserOnline && simulatedOffline
                      ? 'Çevrimdışı (Gerçek Ağ Kesik + Demo Simülasyonu)'
                      : !browserOnline
                      ? 'Çevrimdışı (Gerçek Ağ Kesintisi)'
                      : 'Çevrimdışı (Demo Simülasyonu)'}
                  </span>
                </>
              )}
              {connection === 'syncing' && (
                <>
                  <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-blue-700" />
                  <span>Senkronize ediliyor</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mod Seçim Çubuğu ve Hızlı Kontroller */}
        <div className="border-t border-slate-200 bg-slate-100 px-3 py-2 sm:px-4">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-bold text-slate-800 sm:text-sm">
                Çalışma Modu:
              </span>
              <button
                type="button"
                data-testid="mode-btn-normal"
                aria-pressed={mode === 'normal'}
                aria-label="Normal Mod [NORMAL]"
                onClick={() => setMode('normal')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition sm:text-sm ${
                  mode === 'normal'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>[NORMAL] Normal Mod</span>
              </button>
              <button
                type="button"
                data-testid="mode-btn-crisis"
                aria-pressed={mode === 'crisis'}
                aria-label="Kriz ve Kesinti Modu [KRİZ]"
                onClick={() => setMode('crisis')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition sm:text-sm ${
                  mode === 'crisis'
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-200'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>[KRİZ] Kriz / Kesinti Modu</span>
              </button>
              <button
                type="button"
                data-testid="mode-btn-recovery"
                aria-pressed={mode === 'recovery'}
                aria-label="İyileşme Modu [İYİLEŞME]"
                onClick={() => setMode('recovery')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition sm:text-sm ${
                  mode === 'recovery'
                    ? 'bg-amber-700 text-white shadow-sm'
                    : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-200'
                }`}
              >
                <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>[İYİLEŞME] İyileşme Modu</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleMissingDataExample}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50"
              >
                <HelpCircle className="h-3.5 w-3.5 text-slate-600" />
                {missingSourceDemo
                  ? 'Eksik Veri Örneğini Kapat'
                  : 'Eksik Veri ("Veri Yok") Örneği'}
              </button>
              <button
                type="button"
                onClick={handleRefreshSyntheticData}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-700" />
                Örnek Verileri Yenile
              </button>
              <button
                type="button"
                data-testid="header-demo-panel-btn"
                onClick={() => setIsDemoPanelOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-400 bg-purple-900 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-purple-800"
              >
                <span>Demo Paneli</span>
              </button>
            </div>
          </div>
        </div>

        {/* MOBİL VE TABLET ÜST SEKME ÇUBUĞU (390px ekranlar için 2x2 ergonomik ızgara) */}
        <nav
          aria-label="Mobil Sekme Menüsü"
          data-testid="mobile-tab-bar"
          className="border-t border-slate-200 bg-white px-3 py-2 lg:hidden"
        >
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {navItems.map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`mobile-tab-${item.id}`}
                  onClick={() => selectTab(item.id)}
                  className={`flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-extrabold transition ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {item.icon}
                    <span className="truncate">{item.shortLabel}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 text-slate-900'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* ANA GÖVDE: Masaüstünde Sol Yan Menü + Sağ İçerik Alanı */}
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-5 sm:px-4 lg:flex-row lg:items-start">
        {/* MASAÜSTÜ SOL YAN MENÜ */}
        <aside
          aria-label="Masaüstü Sol Gezinme Menüsü"
          data-testid="desktop-sidebar-nav"
          className="hidden w-64 shrink-0 rounded-xl border border-slate-300 bg-white p-3 shadow-sm lg:sticky lg:top-32 lg:block print:hidden"
        >
          <div className="mb-2 px-2 text-xs font-extrabold uppercase tracking-wider text-slate-600">
            Bölümler (Sekmeler)
          </div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`tab-btn-${item.id}`}
                  onClick={() => selectTab(item.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-extrabold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 text-slate-900'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Yan Menü Altında Dürüstlük Özeti */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
            <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
              <ShieldAlert className="h-4 w-4 shrink-0 text-slate-700" />
              <span>Kapsam ve Dürüstlük Notu</span>
            </div>
            <p className="mt-1">
              ARK-OS bir karar destek ve koordinasyon aracıdır. Yapısal güvenlik
              analizi veya tahliye sistemi <strong>değildir</strong>. Tüm veriler{' '}
              <span className="underline">sentetik örnek veridir</span>.
            </p>
          </div>
        </aside>

        {/* SAĞ ANA İÇERİK ALANI */}
        <main className="min-w-0 flex-1 space-y-6">
          {/* Mobil için Kısa Dürüstlük Bildirimi */}
          <div className="rounded-xl border border-slate-300 bg-white p-3.5 text-xs leading-relaxed text-slate-800 shadow-sm lg:hidden print:hidden">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" />
              <div>
                <span className="font-extrabold text-slate-950">
                  Sistem Kapsamı:
                </span>{' '}
                ARK-OS bir karar destek aracıdır;{' '}
                <strong>
                  yapısal güvenlik analizi veya tahliye sistemi DEĞİLDİR.
                </strong>{' '}
                Tüm veriler <span className="underline">örnek veridir</span>.
              </div>
            </div>
          </div>

          {/* =========================================================
              SEKME 1: GÖSTERGE PANELİ (dashboard)
             ========================================================= */}
          {activeTab === 'dashboard' && (
            <div
              data-testid="tab-panel-dashboard"
              className="no-print space-y-6 print:hidden"
            >
              {/* FAZ 2.3: EN ÜSTTE 4 KARTLIK "GENEL DURUM" ÖZETİ */}
              <section
                aria-label="Genel Durum Özeti"
                data-testid="general-status-summary"
                className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-extrabold text-slate-950 sm:text-lg">
                    Genel Durum Özeti (İlk Bakış)
                  </h2>
                  <span className="text-xs font-bold text-slate-600">
                    Canlı Sistem & Senkronizasyon Durumu
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {/* Kart 1: Bağlantı Durumu */}
                  <div
                    data-testid="summary-card-connection"
                    className={`rounded-xl border p-3.5 ${
                      connection === 'online'
                        ? 'border-emerald-300 bg-emerald-50/70'
                        : 'border-red-300 bg-red-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-700">
                      <span>1. Bağlantı Durumu</span>
                      {connection === 'online' ? (
                        <Wifi className="h-4 w-4 text-emerald-700" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-700" />
                      )}
                    </div>
                    <div className="mt-1.5 text-base font-extrabold text-slate-950">
                      {connection === 'online'
                        ? 'Çevrimiçi'
                        : connection === 'syncing'
                        ? 'Senkronize Ediliyor'
                        : 'Çevrimdışı'}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      {connection === 'online'
                        ? 'Gerçek ağ aktif • Sunucu bağlı'
                        : !browserOnline
                        ? 'Gerçek ağ kesintisi (Yerel mod)'
                        : 'Demo simülasyon kesintisi aktif'}
                    </p>
                  </div>

                  {/* Kart 2: Çalışma Modu */}
                  <div
                    data-testid="summary-card-mode"
                    className={`rounded-xl border p-3.5 ${
                      mode === 'crisis'
                        ? 'border-red-300 bg-red-50/80'
                        : mode === 'recovery'
                        ? 'border-amber-300 bg-amber-50/80'
                        : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-700">
                      <span>2. Çalışma Modu</span>
                      <Activity className="h-4 w-4 text-slate-800" />
                    </div>
                    <div className="mt-1.5 text-base font-extrabold text-slate-950">
                      {currentModeInfo.shortLabel}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      {currentModeInfo.priorityNote}
                    </p>
                  </div>

                  {/* Kart 3: Bekleyen Kayıt Sayısı */}
                  <div
                    data-testid="summary-card-pending"
                    className={`rounded-xl border p-3.5 ${
                      pendingSyncCount > 0
                        ? 'border-amber-400 bg-amber-50/80'
                        : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-700">
                      <span>3. Bekleyen Kayıt</span>
                      <Database className="h-4 w-4 text-indigo-700" />
                    </div>
                    <div className="mt-1.5 text-base font-extrabold text-slate-950">
                      {pendingSyncCount === 0
                        ? '0 Bekleyen (Güncel)'
                        : `${pendingSyncCount} Kayıt Kuyrukta`}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      Toplam {openIncidentCount} açık olay •{' '}
                      <button
                        type="button"
                        onClick={() => selectTab('incidents_report')}
                        className="font-bold text-indigo-700 underline hover:text-indigo-900"
                      >
                        Kayıtlara git
                      </button>
                    </p>
                  </div>

                  {/* Kart 4: Açık Anomali var mı? */}
                  <div
                    data-testid="summary-card-anomaly"
                    className={`rounded-xl border p-3.5 ${
                      activeAnomalyCount > 0
                        ? 'border-amber-400 bg-amber-50/80'
                        : 'border-emerald-300 bg-emerald-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-700">
                      <span>4. Açık Anomali / Veri</span>
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          activeAnomalyCount > 0
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      />
                    </div>
                    <div className="mt-1.5 text-base font-extrabold text-slate-950">
                      {activeAnomalyCount === 0
                        ? 'Açık Anomali Yok'
                        : `${activeAnomalyCount} İnceleme Uyarısı`}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      {hasWaterAnomaly && missingReadingsCount > 0
                        ? 'Su farkı anomalisi + Eksik sensör verisi'
                        : hasWaterAnomaly
                        ? 'Su sayaç farkı inceleme eşiğini aştı'
                        : missingReadingsCount > 0
                        ? `${missingReadingsCount} veri kaynağından okuma alınamıyor`
                        : 'Su farkı normal aralıkta • Sensörler aktif'}
                    </p>
                  </div>
                </div>
              </section>

              {/* KRİZ MODUNDA KRİTİK REZERV ÖZETİ VE YÜK AZALTMA ÖNERİSİ */}
              {mode === 'crisis' && (
                <div className="space-y-4">
                  <section className="rounded-xl border-2 border-red-400 bg-red-50/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 text-base font-extrabold text-red-950">
                        <AlertTriangle className="h-5 w-5 text-red-700" />
                        Kriz / Kesinti Modu — Kritik Rezerv ve Yedek Güç Durumu
                      </h2>
                      <button
                        type="button"
                        onClick={() => selectTab('crisis_playbook')}
                        className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800"
                      >
                        Playbook Kontrol Listesini Aç →
                      </button>
                    </div>
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
                      <BackupPowerCard
                        reading={snapshot.electricity.generatorStatus}
                        highlight
                      />
                    </div>
                  </section>

                  <LoadSheddingCard
                    isOffline={connection === 'offline'}
                    onDecisionRecorded={handlePlaybookStepRecorded}
                  />
                </div>
              )}

              {/* 1. SU GÖSTERGELERİ PANELİ */}
              <section aria-label="Su Göstergeleri">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-950 sm:text-lg">
                    <Droplets className="h-5 w-5 text-blue-600" />
                    Su Yönetimi Göstergeleri
                  </h2>
                  <span className="text-xs font-bold text-slate-600 sm:text-sm">
                    Ana Sayaç • Daireler Toplamı • Depo Seviyesi
                  </span>
                </div>

                <WaterAnomalyBanner
                  mainMeterM3={snapshot.water.mainMeterM3.value}
                  apartmentsTotalM3={snapshot.water.apartmentsTotalM3.value}
                  isSimulatedAnomaly={waterAnomalyDemo}
                  onToggleSimulateAnomaly={toggleWaterAnomalySimulation}
                  thresholdM3={waterThresholdM3}
                  thresholdPct={waterThresholdPct}
                  onChangeThresholds={(nextM3, nextPct) => {
                    setWaterThresholdM3(nextM3);
                    setWaterThresholdPct(nextPct);
                  }}
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
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-950 sm:text-lg">
                    <Zap className="h-5 w-5 text-amber-600" />
                    Elektrik ve Yedek Enerji Göstergeleri
                  </h2>
                  <span className="text-xs font-bold text-slate-600 sm:text-sm">
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
                  <BackupPowerCard
                    reading={snapshot.electricity.generatorStatus}
                    highlight={mode === 'crisis' || mode === 'recovery'}
                  />
                </div>
              </section>
            </div>
          )}

          {/* =========================================================
              SEKME 2: KRİZ VE PLAYBOOK (crisis_playbook)
             ========================================================= */}
          {activeTab === 'crisis_playbook' && (
            <div
              data-testid="tab-panel-crisis_playbook"
              className="no-print space-y-6 print:hidden"
            >
              <section
                aria-label="Kriz Modu ve Kritik Rezervler"
                className={`rounded-xl border p-4 ${currentModeInfo.bannerClass}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold sm:text-lg">
                      {currentModeInfo.title}
                    </h2>
                    <p className="mt-1 text-xs font-medium sm:text-sm">
                      {currentModeInfo.description}
                    </p>
                  </div>
                  {mode !== 'crisis' && (
                    <button
                      type="button"
                      onClick={() => setMode('crisis')}
                      className="rounded-lg bg-red-700 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-red-800 sm:text-sm"
                    >
                      Kriz / Kesinti Modunu Aktifleştir
                    </button>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <MetricCard
                    reading={snapshot.water.tankLevelPct}
                    icon={<Droplets className="h-5 w-5 text-blue-600" />}
                    highlight={mode === 'crisis'}
                  />
                  <MetricCard
                    reading={snapshot.electricity.batterySocPct}
                    icon={<BatteryCharging className="h-5 w-5 text-emerald-600" />}
                    highlight={mode === 'crisis'}
                  />
                  <BackupPowerCard
                    reading={snapshot.electricity.generatorStatus}
                    highlight={mode === 'crisis'}
                  />
                </div>
              </section>

              {mode === 'crisis' && (
                <LoadSheddingCard
                  isOffline={connection === 'offline'}
                  onDecisionRecorded={handlePlaybookStepRecorded}
                />
              )}

              <PlaybookSection
                isOffline={connection === 'offline'}
                onStepRecorded={handlePlaybookStepRecorded}
                externalSelectedPlaybookId={activePlaybookId}
              />
            </div>
          )}

          {/* =========================================================
              SEKME 3: OLAY KAYITLARI VE RAPOR (incidents_report)
             ========================================================= */}
          <div
            data-testid={
              activeTab === 'incidents_report'
                ? 'tab-panel-incidents_report'
                : undefined
            }
            className={
              activeTab === 'incidents_report'
                ? 'space-y-6'
                : 'hidden print:block'
            }
          >
            {activeTab === 'incidents_report' && (
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

            <AfterActionReportSection
              siteName={snapshot.siteName}
              refreshToken={syncRefreshToken}
              activeAnomalyCount={activeAnomalyCount}
            />
          </div>

          {/* =========================================================
              SEKME 4: TEKNİK BAKIM (maintenance)
             ========================================================= */}
          {activeTab === 'maintenance' && (
            <div
              data-testid="tab-panel-maintenance"
              className="no-print space-y-6 print:hidden"
            >
              <section
                aria-label="Bakım İşleri"
                className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-950 sm:text-lg">
                      <Wrench className="h-5 w-5 text-slate-800" />
                      Teknik Bakım ve Kontrol İşleri
                    </h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-700 sm:text-sm">
                      {mode === 'crisis'
                        ? 'Kriz modunda yüksek öncelikli teknik işler en üstte sıralanır.'
                        : mode === 'recovery'
                        ? 'İyileşme modunda devam eden ve bekleyen açık işler en üstte sıralanır.'
                        : 'Normal modda günlük teknik bakım listesi görüntülenir.'}
                    </p>
                  </div>
                  <span className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-extrabold text-slate-900">
                    Örnek veri ({sortedMaintenanceTasks.length} kayıt)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-300 bg-slate-100 text-xs font-extrabold uppercase text-slate-800">
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
                          <td className="px-3 py-3 font-bold text-slate-950">
                            <span className="mr-2 rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-800">
                              {task.id}
                            </span>
                            {task.title}
                          </td>
                          <td className="px-3 py-3 text-xs font-semibold text-slate-800 sm:text-sm">
                            {task.location}
                          </td>
                          <td className="px-3 py-3 text-xs font-bold text-slate-800 sm:text-sm">
                            {task.category}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-md px-2.5 py-0.5 text-xs font-extrabold ${
                                task.priority === 'Yüksek'
                                  ? 'bg-red-100 text-red-900'
                                  : task.priority === 'Orta'
                                  ? 'bg-amber-100 text-amber-950'
                                  : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-md px-2.5 py-0.5 text-xs font-extrabold ${
                                task.status === 'Tamamlandı'
                                  ? 'bg-emerald-100 text-emerald-950'
                                  : task.status === 'Devam Ediyor'
                                  ? 'bg-blue-100 text-blue-950'
                                  : 'bg-amber-100 text-amber-950'
                              }`}
                            >
                              {task.status}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-xs font-semibold text-slate-700 sm:text-sm">
                            {task.updatedAt}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* SAĞ ALT DEMO KONTROL ÇEKMECESİ VE KÜÇÜK "DEMO" DÜĞMESİ */}
      <DemoControlPanel
        isOpen={isDemoPanelOpen}
        onToggleOpen={() => setIsDemoPanelOpen((prev) => !prev)}
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
        onTriggerSimulatedCrash={() => setSimulatedCrash(true)}
      />

      {/* HAKKINDA PENCERESİ (FAZ 6.2) */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* ALT BİLGİ ÇUBUĞU (FAZ 6.2 SÜRÜM BİLGİSİ — Tekrarsız) */}
      <footer className="mt-8 border-t border-slate-300 bg-white py-4 text-xs font-medium text-slate-800 print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4">
          <div data-testid="footer-version-notice" className="font-semibold">
            {ARK_OS_VERSION_NOTICE}
          </div>
        </div>
      </footer>
      </div>
    </ErrorBoundary>
  );
}
export default App;
