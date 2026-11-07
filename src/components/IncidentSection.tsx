import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  CloudUpload,
  Database,
  MapPin,
  PlusCircle,
  RefreshCw,
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

  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSaveMessage(null);

    const trimmedDetail = locationDetail.trim();
    const trimmedDesc = description.trim();

    // Kural #7: Kullanıcı girdilerini doğrula
    if (!selectedBlock) {
      setValidationError('Lütfen bir blok veya ana alan seçin.');
      return;
    }
    if (trimmedDetail.length > 80) {
      setValidationError('Konum detayı en fazla 80 karakter olabilir.');
      return;
    }
    if (trimmedDesc.length < 5) {
      setValidationError('Lütfen en az 5 karakterlik anlaşılır bir açıklama yazın.');
      return;
    }
    if (trimmedDesc.length > 500) {
      setValidationError('Açıklama en fazla 500 karakter olabilir.');
      return;
    }

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

  const openCount = incidents.filter((i) => i.status !== 'Çözüldü').length;
  const pendingSyncCount = incidents.filter(
    (i) => i.syncStatus === 'pending'
  ).length;

  return (
    <section
      aria-label="Olay ve İhtiyaç Kaydı"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            Olay ve İhtiyaç Kaydı (Yerel IndexedDB & Sunucu Senkronizasyonu)
          </h2>
          <p className="text-xs text-slate-600">
            İnternet kesik olsa bile tüm olay ve ihtiyaç kayıtları tarayıcınızdaki{' '}
            <strong>IndexedDB (Dexie)</strong> veritabanına kaydedilir, bağlantı geri
            geldiğinde yerel sahte sunucuya senkronize edilir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-900">
            <Database className="h-3.5 w-3.5 text-indigo-600" />
            Yerel Kayıt: {incidents.length} ({openCount} Açık • {pendingSyncCount}{' '}
            Bekleyen)
          </span>
          <button
            type="button"
            data-testid="manual-sync-btn"
            disabled={isOffline || isSyncing}
            onClick={onTriggerSync}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${
              isOffline
                ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
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
          className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900"
        >
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{lastSyncResult.message}</span>
          </div>
          <span className="text-[11px] font-medium text-emerald-800">
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
          className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-900"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Yerel kayıtlar güvende (IndexedDB), ancak sunucu senkronizasyonu şu an
            yapılamadı: {syncError}
          </span>
        </div>
      )}

      {/* YENİ OLAY / İHTİYAÇ KAYIT FORMU */}
      <form
        onSubmit={handleSubmit}
        className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
            <PlusCircle className="h-4 w-4 text-indigo-600" />
            Yeni Olay veya İhtiyaç Kaydı Ekle
          </h3>
          {isOffline && (
            <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
              <WifiOff className="h-3.5 w-3.5" />
              Çevrimdışı Kayıt Modu Aktif (IndexedDB)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="incident-type"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Kayıt Türü
            </label>
            <select
              id="incident-type"
              value={type}
              onChange={(e) => setType(e.target.value as IncidentRecordType)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
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
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Öncelik
            </label>
            <select
              id="incident-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as IncidentPriority)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
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
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Konum (Blok / Alan)
            </label>
            <select
              id="incident-block"
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
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
              className="mb-1 block text-xs font-semibold text-slate-700"
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
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-3">
            <label
              htmlFor="incident-description"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Açıklama (En az 5, en fazla 500 karakter)
            </label>
            <input
              id="incident-description"
              type="text"
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Olayı veya ihtiyacı kısaca açıklayın..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="incident-status"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Başlangıç Durumu
            </label>
            <select
              id="incident-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as IncidentStatus)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none"
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
            className="mt-3 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            {validationError}
          </div>
        )}

        {saveMessage && (
          <div
            role="status"
            className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            {saveMessage}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Zaman damgası kayıt anında otomatik oluşturulur.
          </span>
          <button
            type="submit"
            data-testid="submit-incident-btn"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <PlusCircle className="h-4 w-4" />
            Kaydı Yerel Veritabanına Ekle
          </button>
        </div>
      </form>

      {/* KAYIT LİSTESİ */}
      {loading ? (
        <p className="py-4 text-center text-xs text-slate-500">
          Yerel IndexedDB kayıtları yükleniyor...
        </p>
      ) : sortedIncidents.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">
          Henüz olay veya ihtiyaç kaydı bulunmuyor.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <th className="px-3 py-2.5">Zaman Damgası</th>
                <th className="px-3 py-2.5">Tür</th>
                <th className="px-3 py-2.5">Öncelik</th>
                <th className="px-3 py-2.5">Konum (Blok/Alan)</th>
                <th className="px-3 py-2.5">Açıklama</th>
                <th className="px-3 py-2.5">Senkronizasyon</th>
                <th className="px-3 py-2.5">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedIncidents.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">
                    <div className="font-medium text-slate-800">
                      {formatDateTimeTr(item.createdAt)}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                      <span className="font-mono">{item.id}</span>
                      {item.createdOffline && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.2 font-semibold text-amber-800">
                          Çevrimdışı alındı
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs font-semibold text-slate-800">
                    {item.type}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                        item.priority === 'Kritik'
                          ? 'bg-red-600 text-white'
                          : item.priority === 'Yüksek'
                          ? 'bg-red-100 text-red-800'
                          : item.priority === 'Orta'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs font-medium text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {item.location}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-700">
                    {item.description}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {item.syncStatus === 'synced' ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" />
                        Senkronize edildi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
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
                      className={`rounded border px-2 py-1 text-xs font-semibold ${
                        item.status === 'Çözüldü'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : item.status === 'İnceleniyor'
                          ? 'border-blue-300 bg-blue-50 text-blue-800'
                          : 'border-amber-300 bg-amber-50 text-amber-800'
                      }`}
                    >
                      <option value="Açık">Açık</option>
                      <option value="İnceleniyor">İnceleniyor</option>
                      <option value="Çözüldü">Çözüldü</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
export default IncidentSection;
