import {
  getAllIncidents,
  getPendingIncidents,
  markIncidentsSynced,
} from '../db/localDb';

export interface SyncResultSummary {
  ok: boolean;
  message: string;
  insertedCount: number;
  updatedCount: number;
  duplicateSkippedCount: number;
  totalServerRecords: number;
  syncedAt: string | null;
}

const API_BASE = 'http://127.0.0.1:3001';

export async function syncLocalIncidentsToServer(
  sendAllForIdempotencyCheck = false
): Promise<SyncResultSummary> {
  const recordsToSend = sendAllForIdempotencyCheck
    ? await getAllIncidents()
    : await getPendingIncidents();

  if (recordsToSend.length === 0) {
    // Check server health to report current count
    const healthRes = await fetch(`${API_BASE}/api/health`);
    if (!healthRes.ok) {
      throw new Error('Yerel sahte sunucuya ulaşılamadı.');
    }
    const health = await healthRes.json();
    return {
      ok: true,
      message: 'Senkronize edildi (Bekleyen yeni yerel kayıt yok, tüm kayıtlar güncel).',
      insertedCount: 0,
      updatedCount: 0,
      duplicateSkippedCount: 0,
      totalServerRecords: health.storedIncidentCount ?? 0,
      syncedAt: health.lastSyncAt ?? new Date().toISOString(),
    };
  }

  const response = await fetch(`${API_BASE}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: recordsToSend }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Senkronizasyon sırasında sunucu hatası oluştu.');
  }

  await markIncidentsSynced(data.syncedIds || []);

  return {
    ok: true,
    message: `Senkronize edildi (${data.insertedCount} yeni eklendi, ${data.updatedCount} güncellendi, ${data.duplicateSkippedCount} mükerrer atlandı).`,
    insertedCount: data.insertedCount,
    updatedCount: data.updatedCount,
    duplicateSkippedCount: data.duplicateSkippedCount,
    totalServerRecords: data.totalServerRecords,
    syncedAt: data.syncedAt,
  };
}
