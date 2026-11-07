import {
  getAllIncidents,
  getPendingIncidents,
  markIncidentsFailed,
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

let inFlightSyncPromise: Promise<SyncResultSummary> | null = null;

async function performSyncInternal(
  sendAllForIdempotencyCheck: boolean
): Promise<SyncResultSummary> {
  const recordsToSend = sendAllForIdempotencyCheck
    ? await getAllIncidents()
    : await getPendingIncidents();

  if (recordsToSend.length === 0) {
    const healthRes = await fetch(`${API_BASE}/api/health`);
    if (!healthRes.ok) {
      throw new Error('Gönderilemedi, tekrar denenecek (Sunucuya ulaşılamadı).');
    }
    const health = await healthRes.json();
    return {
      ok: true,
      message:
        'Senkronize edildi (Bekleyen yeni yerel kayıt yok, tüm kayıtlar güncel).',
      insertedCount: 0,
      updatedCount: 0,
      duplicateSkippedCount: 0,
      totalServerRecords: health.storedIncidentCount ?? 0,
      syncedAt: health.lastSyncAt ?? new Date().toISOString(),
    };
  }

  try {
    const response = await fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: recordsToSend }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(
        data.error || 'Gönderilemedi, tekrar denenecek (Sunucu hatası).'
      );
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
  } catch (err) {
    const pendingIds = recordsToSend
      .filter((r) => r.syncStatus !== 'synced')
      .map((r) => r.id);
    if (pendingIds.length > 0) {
      await markIncidentsFailed(pendingIds);
    }
    throw err instanceof Error
      ? err
      : new Error('Gönderilemedi, tekrar denenecek.');
  }
}

export async function syncLocalIncidentsToServer(
  sendAllForIdempotencyCheck = false
): Promise<SyncResultSummary> {
  if (inFlightSyncPromise) {
    return inFlightSyncPromise;
  }
  inFlightSyncPromise = performSyncInternal(sendAllForIdempotencyCheck).finally(
    () => {
      inFlightSyncPromise = null;
    }
  );
  return inFlightSyncPromise;
}
