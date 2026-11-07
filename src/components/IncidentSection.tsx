import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CloudUpload,
  Database,
  Filter,
  ListChecks,
  MapPin,
  PlusCircle,
  RefreshCw,
  Tag,
  WifiOff,
} from 'lucide-react';
import {
  addIncidentRecord,
  ensureInitialIncidents,
  getAllIncidents,
  updateIncidentStatus,
} from '../db/localDb';
import { SyncResultSummary } from '../services/syncService';
import {
  IncidentPriority,
  IncidentRecord,
  IncidentRecordType,
  IncidentStatus,
  SystemMode,
} from '../types';

const INCIDENT_TYPES: IncidentRecordType[] = [
  'Arıza / Hasar Bildirimi',
  'Su / Enerji Kesintisi',
  'Temel İhtiyaç Talebi',
  'Bilgi / Koordinasyon Notu',
];

const PRIORITIES: IncidentPriority[] = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];

const BLOCK_LOCATIONS: string[] = [
  'A Blok',
  'B Blok',
  'C Blok',
  'D Blok',
  'E Blok',
  'F Blok',
  'Merkez Su Deposu / Hidrofor',
  'Jeneratör / Trafo Alanı',
  'Site Giriş / Güvenlik Kulübesi',
  'Ortak Bahçe / Otopark',
];

export interface QuickTagPreset {
  id: string;
  label: string;
  type: IncidentRecordType;
  priority: IncidentPriority;
  block: string;
  description: string;
}

const QUICK_TAG_PRESETS: QuickTagPreset[] = [
  {
    id: 'pipe_burst',
    label: 'Boru patlağı',
    type: 'Arıza / Hasar Bildirimi',
    priority: 'Yüksek',
    block: 'Merkez Su Deposu / Hidrofor',
    description:
      'Boru patlağı bildirimi: Ana su hattında sızıntı gözlemlendi, vana kontrolü gerekiyor.',
  },
  {
    id: 'pump_failure',
    label: 'Pompa arızası',
    type: 'Arıza / Hasar Bildirimi',
    priority: 'Yüksek',
    block: 'Merkez Su Deposu / Hidrofor',
    description:
      'Pompa arızası bildirimi: Hidrofor pompasında basınç düşüklüğü ve olağandışı ses tespit edildi.',
  },
  {
    id: 'power_outage',
    label: 'Elektrik kesintisi',
    type: 'Su / Enerji Kesintisi',
    priority: 'Kritik',
    block: 'Jeneratör / Trafo Alanı',
    description:
      'Elektrik kesintisi: Blok genelinde şebeke elektriği kesildi, yedek güç durumu kontrol ediliyor.',
  },
  {
    id: 'flooding',
    label: 'Su baskını',
    type: 'Arıza / Hasar Bildirimi',
    priority: 'Kritik',
    block: 'Ortak Bahçe / Otopark',
    description:
      'Su baskını bildirimi: Bodrum / otopark giderlerinde su birikmesi var, tahliye pompası kontrolü gerekiyor.',
  },
  {
    id: 'generator_issue',
    label: 'Jeneratör sorunu',
    type: 'Su / Enerji Kesintisi',
    priority: 'Yüksek',
    block: 'Jeneratör / Trafo Alanı',
    description:
      'Jeneratör sorunu: Devreye girme veya yakıt/akü kontrolü için teknik inceleme gerekiyor.',
  },
  {
    id: 'help_request',
    label: 'Yardım talebi',
    type: 'Temel İhtiyaç Talebi',
    priority: 'Orta',
    block: 'A Blok',
    description:
      'Yardım talebi: Daire sakini için içme suyu / temel ihtiyaç koordinasyon desteği talep edildi.',
  },
];

const PAGE_SIZE = 5;

function formatDateTimeTr(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function IncidentSection({
  mode,
  isOffline,
  isSyncing,
  lastSyncResult,
  syncError,
  onTriggerSync,
  syncRefreshToken,
}: {
  mode: SystemMode;
  isOffline: boolean;
  isSyncing: boolean;
  lastSyncResult: SyncResultSummary | null;
  syncError: string | null;
  onTriggerSync: () => Promise<void>;
  syncRefreshToken: number;
}) {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form alanları
  const [type, setType] = useState<IncidentRecordType>('Arıza / Hasar Bildirimi');
  const [priority, setPriority] = useState<IncidentPriority>('Orta');
  const [selectedBlock, setSelectedBlock] = useState<string>('A Blok');
  const [locationDetail, setLocationDetail] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<IncidentStatus>('Açık');
  const [descRuleViolated, setDescRuleViolated] = useState<boolean>(false);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const descriptionInputRef = useRef<HTMLInputElement | null>(null);

  // Playbook alt adımları açılır/kapanır durumu
  const [expandedPlaybookRows, setExpandedPlaybookRows] = useState<
    Record<string, boolean>
  >({});

  // FAZ 3.4: Günlük filtreleri ve sayfalama
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSync, setFilterSync] = useState<string>('ALL');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  useEffect(() => {
    let active = true;
    ensureInitialIncidents()
      .then((records) => {
        if (active) {
          setIncidents(records);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('IndexedDB okuma hatası:', err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [syncRefreshToken]);

  const handleApplyQuickTag = (preset: QuickTagPreset) => {
    setType(preset.type);
    setPriority(preset.priority);
    setSelectedBlock(preset.block);
    setDescription(preset.description);
    setDescRuleViolated(false);
    setValidationError(null);
    setSaveMessage(null);
    descriptionInputRef.current?.focus();
  };

  const trimmedDescLength = description.trim().length;
  const isCounterRed =
    descRuleViolated || (description.length > 0 && trimmedDescLength < 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSaveMessage(null);

    const trimmedDetail = locationDetail.trim();
    const trimmedDesc = description.trim();

    if (!selectedBlock) {
      setValidationError('Lütfen bir blok veya ana alan seçin.');
      return;
    }
    if (trimmedDetail.length > 80) {
      setValidationError('Konum detayı en fazla 80 karakter olabilir.');
      return;
    }
    // FAZ 3.2: 5 karakter alt sınırı kalsın, kural ihlalinde hata mesajı yerine sayaç kırmızıya dönsün
    if (trimmedDesc.length < 5) {
      setDescRuleViolated(true);
      descriptionInputRef.current?.focus();
      return;
    }
    if (trimmedDesc.length > 500) {
      setDescRuleViolated(true);
      return;
    }

    setDescRuleViolated(false);

    const fullLocation = trimmedDetail
      ? `${selectedBlock} - ${trimmedDetail}`
      : selectedBlock;

    try {
      await addIncidentRecord({
        type,
        priority,
        location: fullLocation,
        description: trimmedDesc,
        status,
        createdOffline: isOffline,
      });

      const updated = await getAllIncidents();
      setIncidents(updated);
      setLocationDetail('');
      setDescription('');
      setStatus('Açık');
      setSaveMessage(
        isOffline
          ? 'Kayıt çevrimdışı olarak yerel veritabanına (IndexedDB) kaydedildi. Bağlantı gelince senkronize edilecek.'
          : 'Kayıt yerel veritabanına (IndexedDB) eklendi.'
      );
      if (!isOffline) {
        await onTriggerSync();
        const afterSync = await getAllIncidents();
        setIncidents(afterSync);
      }
    } catch (err) {
      console.error('Kayıt ekleme hatası:', err);
      setValidationError('Kayıt yerel veritabanına yazılamadı.');
    }
  };

  const handleStatusChange = async (id: string, nextStatus: IncidentStatus) => {
    await updateIncidentStatus(id, nextStatus);
    const updated = await getAllIncidents();
    setIncidents(updated);
    if (!isOffline) {
      await onTriggerSync();
      const afterSync = await getAllIncidents();
      setIncidents(afterSync);
    }
  };

  const togglePlaybookRowExpand = (id: string) => {
    setExpandedPlaybookRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Üç modda farklı sıralama önceliği:
  const sortedIncidents = [...incidents].sort((a, b) => {
    if (mode === 'crisis') {
      const pWeight: Record<IncidentPriority, number> = {
        Kritik: 4,
        Yüksek: 3,
        Orta: 2,
        Düşük: 1,
      };
      if (pWeight[b.priority] !== pWeight[a.priority]) {
        return pWeight[b.priority] - pWeight[a.priority];
      }
    }
    if (mode === 'recovery') {
      const sWeight: Record<IncidentStatus, number> = {
        Açık: 3,
        İnceleniyor: 2,
        Çözüldü: 1,
      };
      if (sWeight[b.status] !== sWeight[a.status]) {
        return sWeight[b.status] - sWeight[a.status];
      }
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // FAZ 3.4: Filtreleme
  const filteredIncidents = sortedIncidents.filter((item) => {
    if (filterType !== 'ALL' && item.type !== filterType) return false;
    if (filterPriority !== 'ALL' && item.priority !== filterPriority)
      return false;
    if (filterStatus !== 'ALL' && item.status !== filterStatus) return false;
    if (filterSync !== 'ALL' && item.syncStatus !== filterSync) return false;
    return true;
  });

  const paginatedIncidents = filteredIncidents.slice(0, visibleCount);
  const remainingCount = Math.max(0, filteredIncidents.length - visibleCount);

  const openCount = incidents.filter((i) => i.status !== 'Çözüldü').length;
  const pendingSyncCount = incidents.filter(
    (i) => i.syncStatus === 'pending' || i.syncStatus === 'failed'
  ).length;

  return (
    <section
      aria-label="Olay ve İhtiyaç Kaydı"
      className="no-print rounded-xl border border-slate-300 bg-white p-4 shadow-sm print:hidden"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-950 sm:text-lg">
            <ClipboardList className="h-5 w-5 text-indigo-700" />
            Olay ve İhtiyaç Kaydı (Yerel IndexedDB & Sunucu Senkronizasyonu)
          </h2>
          <p className="text-xs font-medium text-slate-700 sm:text-sm">
            İnternet kesik olsa bile tüm olay ve ihtiyaç kayıtları tarayıcınızdaki{' '}
            <strong>IndexedDB (Dexie)</strong> veritabanına kaydedilir, bağlantı geri
            geldiğinde otomatik senkronize edilir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-extrabold text-indigo-950">
            <Database className="h-3.5 w-3.5 text-indigo-700" />
            Yerel Kayıt: {incidents.length} ({openCount} Açık • {pendingSyncCount}{' '}
            Bekleyen)
          </span>
          <button
            type="button"
            data-testid="manual-sync-btn"
            disabled={isOffline || isSyncing}
            onClick={onTriggerSync}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition ${
              isOffline
                ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                : 'bg-emerald-700 text-white hover:bg-emerald-800'
            }`}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Senkronize ediliyor...
              </>
            ) : (
              <>
                <CloudUpload className="h-3.5 w-3.5" />
                Şimdi Senkronize Et
              </>
            )}
          </button>
        </div>
      </div>

      {/* SENKRONİZASYON DURUM KUTUSU */}
      {lastSyncResult && !syncError && (
        <div
          data-testid="sync-result-banner"
          className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-400 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-950"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>{lastSyncResult.message}</span>
          </div>
          <span className="text-xs font-semibold text-emerald-900">
            Sunucudaki Toplam Kayıt: {lastSyncResult.totalServerRecords} • Son
            Senkronizasyon:{' '}
            {lastSyncResult.syncedAt
              ? formatDateTimeTr(lastSyncResult.syncedAt)
              : '-'}
          </span>
        </div>
      )}

      {syncError && (
        <div
          data-testid="sync-error-banner"
          className="mb-4 flex items-center gap-2 rounded-lg border border-amber-400 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-950"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
          <span>
            <strong>Gönderilemedi, tekrar denenecek:</strong> Yerel kayıtlar
            IndexedDB kuyruğunda güvende; bağlantı sağlandığında otomatik olarak
            tekrar gönderilecek ({syncError}).
          </span>
        </div>
      )}

      {/* YENİ OLAY / İHTİYAÇ KAYIT FORMU */}
      <form
        onSubmit={handleSubmit}
        className="mb-6 rounded-xl border border-slate-300 bg-slate-50 p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900 sm:text-base">
            <PlusCircle className="h-4 w-4 text-indigo-700" />
            Yeni Olay veya İhtiyaç Kaydı Ekle
          </h3>
          {isOffline && (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2.5 py-0.5 text-xs font-extrabold text-red-900">
              <WifiOff className="h-3.5 w-3.5" />
              Çevrimdışı Kayıt Modu Aktif (IndexedDB)
            </span>
          )}
        </div>

        {/* FAZ 3.1: HAZIR HIZLI ETİKET BUTONLARI */}
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Tag className="h-3.5 w-3.5 text-indigo-700" />
            <span>Hızlı Etiketler (Tıklayınca tür ve açıklama otomatik dolar, düzenleyebilirsiniz):</span>
          </div>
          <div
            data-testid="quick-tags-container"
            className="flex flex-wrap gap-2"
          >
            {QUICK_TAG_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                data-testid={`quick-tag-${preset.id}`}
                onClick={() => handleApplyQuickTag(preset)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-indigo-950 transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <span>+ {preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="incident-type"
              className="mb-1 block text-xs font-bold text-slate-800"
            >
              Kayıt Türü
            </label>
            <select
              id="incident-type"
              value={type}
              onChange={(e) => setType(e.target.value as IncidentRecordType)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none sm:text-sm"
            >
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="incident-priority"
              className="mb-1 block text-xs font-bold text-slate-800"
            >
              Öncelik
            </label>
            <select
              id="incident-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as IncidentPriority)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none sm:text-sm"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="incident-block"
              className="mb-1 block text-xs font-bold text-slate-800"
            >
              Konum (Blok / Alan)
            </label>
            <select
              id="incident-block"
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none sm:text-sm"
            >
              {BLOCK_LOCATIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="incident-location-detail"
              className="mb-1 block text-xs font-bold text-slate-800"
            >
              Daire / Alt Konum Detayı (İsteğe bağlı)
            </label>
            <input
              id="incident-location-detail"
              type="text"
              maxLength={80}
              value={locationDetail}
              onChange={(e) => setLocationDetail(e.target.value)}
              placeholder="Örn: Daire 12 veya Bodrum Kat"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none sm:text-sm"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-3">
            <label
              htmlFor="incident-description"
              className="mb-1 block text-xs font-bold text-slate-800"
            >
              Açıklama
            </label>
            <input
              ref={descriptionInputRef}
              id="incident-description"
              type="text"
              maxLength={500}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (e.target.value.trim().length >= 5) {
                  setDescRuleViolated(false);
                }
              }}
              placeholder="Olayı veya ihtiyacı kısaca açıklayın..."
              className={`w-full rounded-lg border bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none sm:text-sm ${
                isCounterRed
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-slate-300 focus:border-indigo-600'
              }`}
            />
            {/* FAZ 3.2: Açıklama alanının sağ altında canlı karakter sayacı */}
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                En az 5, en fazla 500 karakter
              </span>
              <span
                data-testid="description-char-counter"
                className={`rounded px-2 py-0.5 font-mono text-xs transition ${
                  isCounterRed
                    ? 'border border-red-400 bg-red-100 font-extrabold text-red-800'
                    : trimmedDescLength >= 5
                    ? 'bg-emerald-100 font-bold text-emerald-900'
                    : 'bg-slate-200 font-semibold text-slate-700'
                }`}
              >
                {trimmedDescLength} / 500 karakter (min 5)
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="incident-status"
              className="mb-1 block text-xs font-bold text-slate-800"
            >
              Başlangıç Durumu
            </label>
            <select
              id="incident-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as IncidentStatus)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-indigo-600 focus:outline-none sm:text-sm"
            >
              <option value="Açık">Açık</option>
              <option value="İnceleniyor">İnceleniyor</option>
              <option value="Çözüldü">Çözüldü</option>
            </select>
          </div>
        </div>

        {validationError && (
          <div
            role="alert"
            className="mt-3 flex items-center gap-2 rounded-lg border border-red-400 bg-red-50 px-3 py-2 text-xs font-bold text-red-900"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-700" />
            {validationError}
          </div>
        )}

        {saveMessage && (
          <div
            role="status"
            className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-950"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            {saveMessage}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-600">
            Zaman damgası kayıt anında otomatik oluşturulur.
          </span>
          <button
            type="submit"
            data-testid="submit-incident-btn"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-indigo-800 sm:text-sm"
          >
            <PlusCircle className="h-4 w-4" />
            Kaydı Yerel Veritabanına Ekle
          </button>
        </div>
      </form>

      {/* FAZ 3.4: OLAY GÜNLÜĞÜ FİLTRELERİ */}
      <div
        data-testid="incident-filters-bar"
        className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
            <Filter className="h-3.5 w-3.5 text-indigo-700" />
            Olay Günlüğü Filtreleri ({filteredIncidents.length} eşleşen kayıt)
          </span>
          {(filterType !== 'ALL' ||
            filterPriority !== 'ALL' ||
            filterStatus !== 'ALL' ||
            filterSync !== 'ALL') && (
            <button
              type="button"
              data-testid="reset-incident-filters-btn"
              onClick={() => {
                setFilterType('ALL');
                setFilterPriority('ALL');
                setFilterStatus('ALL');
                setFilterSync('ALL');
                setVisibleCount(PAGE_SIZE);
              }}
              className="text-xs font-bold text-indigo-700 underline hover:text-indigo-950"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            aria-label="Türe Göre Filtrele"
            data-testid="filter-type"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
          >
            <option value="ALL">Tür: Tümü</option>
            {INCIDENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            aria-label="Önceliğe Göre Filtrele"
            data-testid="filter-priority"
            value={filterPriority}
            onChange={(e) => {
              setFilterPriority(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
          >
            <option value="ALL">Öncelik: Tümü</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            aria-label="Duruma Göre Filtrele"
            data-testid="filter-status"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
          >
            <option value="ALL">Durum: Tümü</option>
            <option value="Açık">Açık</option>
            <option value="İnceleniyor">İnceleniyor</option>
            <option value="Çözüldü">Çözüldü</option>
          </select>

          <select
            aria-label="Senkronizasyon Durumuna Göre Filtrele"
            data-testid="filter-sync"
            value={filterSync}
            onChange={(e) => {
              setFilterSync(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
          >
            <option value="ALL">Senkronizasyon: Tümü</option>
            <option value="synced">Senkronize edildi</option>
            <option value="pending">Senkronizasyon bekliyor</option>
            <option value="failed">Gönderilemedi, tekrar denenecek</option>
          </select>
        </div>
      </div>

      {/* KAYIT LİSTESİ */}
      {loading ? (
        <p className="py-4 text-center text-xs font-semibold text-slate-600">
          Yerel IndexedDB kayıtları yükleniyor...
        </p>
      ) : filteredIncidents.length === 0 ? (
        <p className="py-4 text-center text-xs font-semibold text-slate-600">
          Seçilen filtreye uygun olay veya ihtiyaç kaydı bulunmuyor.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 text-xs font-extrabold uppercase text-slate-800">
                  <th className="px-3 py-2.5">Zaman Damgası</th>
                  <th className="px-3 py-2.5">Tür</th>
                  <th className="px-3 py-2.5">Öncelik</th>
                  <th className="px-3 py-2.5">Konum (Blok/Alan)</th>
                  <th className="px-3 py-2.5">Açıklama & Alt Adımlar</th>
                  <th className="px-3 py-2.5">Senkronizasyon</th>
                  <th className="px-3 py-2.5">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedIncidents.map((item) => {
                  const hasSubSteps =
                    Array.isArray(item.subSteps) && item.subSteps.length > 0;
                  const isExpanded = Boolean(expandedPlaybookRows[item.id]);

                  return (
                    <tr key={item.id} className="align-top hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-700">
                        <div className="font-bold text-slate-900">
                          {formatDateTimeTr(item.createdAt)}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-600">
                          <span className="font-mono font-semibold">{item.id}</span>
                          {item.createdOffline && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900">
                              Çevrimdışı alındı
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs font-bold text-slate-900">
                        {item.type}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-extrabold ${
                            item.priority === 'Kritik'
                              ? 'bg-red-700 text-white'
                              : item.priority === 'Yüksek'
                              ? 'bg-red-100 text-red-900'
                              : item.priority === 'Orta'
                              ? 'bg-amber-100 text-amber-950'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs font-bold text-slate-800">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-500" />
                          {item.location}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs font-medium text-slate-900 sm:text-sm">
                        <div>{item.description}</div>

                        {/* FAZ 3.3: Playbook çalıştırması tek olay kaydı; adımlar açılır/kapanır alt satırlar */}
                        {hasSubSteps && item.subSteps && (
                          <div className="mt-2">
                            <button
                              type="button"
                              data-testid={`toggle-substeps-${item.id}`}
                              onClick={() => togglePlaybookRowExpand(item.id)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-extrabold text-indigo-950 hover:bg-indigo-100"
                            >
                              <ListChecks className="h-3.5 w-3.5 text-indigo-700" />
                              <span>
                                {isExpanded
                                  ? `Alt Adımları Gizle (${item.subSteps.length})`
                                  : `Uygulanan Adımları Göster (${item.subSteps.length})`}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>

                            {isExpanded && (
                              <ul
                                data-testid={`substeps-list-${item.id}`}
                                className="mt-2 space-y-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 p-2.5 text-xs text-slate-900"
                              >
                                {item.subSteps.map((sub) => (
                                  <li
                                    key={sub.stepId}
                                    className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-1 last:border-b-0 last:pb-0"
                                  >
                                    <span className="font-semibold">
                                      <strong>Adım #{sub.order}:</strong> {sub.title}{' '}
                                      <span className="text-slate-600">
                                        ({sub.location})
                                      </span>
                                    </span>
                                    <span className="font-mono text-[11px] font-bold text-indigo-900">
                                      {formatDateTimeTr(sub.completedAt)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        {item.syncStatus === 'synced' ? (
                          <span
                            data-testid={`sync-badge-${item.id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-extrabold text-emerald-900"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Senkronize edildi
                          </span>
                        ) : item.syncStatus === 'failed' ? (
                          <span
                            data-testid={`sync-badge-${item.id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-xs font-extrabold text-red-900"
                          >
                            <AlertCircle className="h-3 w-3" />
                            Gönderilemedi, tekrar denenecek
                          </span>
                        ) : (
                          <span
                            data-testid={`sync-badge-${item.id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-extrabold text-amber-950"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Senkronizasyon bekliyor
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <select
                          aria-label={`${item.id} durumu`}
                          value={item.status}
                          onChange={(e) =>
                            handleStatusChange(
                              item.id,
                              e.target.value as IncidentStatus
                            )
                          }
                          className={`rounded-md border px-2 py-1 text-xs font-extrabold ${
                            item.status === 'Çözüldü'
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-950'
                              : item.status === 'İnceleniyor'
                              ? 'border-blue-400 bg-blue-50 text-blue-950'
                              : 'border-amber-400 bg-amber-50 text-amber-950'
                          }`}
                        >
                          <option value="Açık">Açık</option>
                          <option value="İnceleniyor">İnceleniyor</option>
                          <option value="Çözüldü">Çözüldü</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* FAZ 3.4: SAYFALAMA / DAHA FAZLA GÖSTER */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs font-bold text-slate-700">
            <span>
              Gösterilen: {paginatedIncidents.length} / {filteredIncidents.length}{' '}
              kayıt
            </span>
            {remainingCount > 0 && (
              <button
                type="button"
                data-testid="load-more-incidents-btn"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-3.5 py-1.5 text-xs font-extrabold text-slate-900 hover:bg-slate-200"
              >
                Daha Fazla Göster (+{remainingCount} kayıt)
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
export default IncidentSection;
