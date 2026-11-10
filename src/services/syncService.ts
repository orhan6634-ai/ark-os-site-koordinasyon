import {
  getAllIncidents,
  getPendingIncidents,
  markIncidentsFailed,
  markIncidentsSynced,
} from '../db/localDb';
import { IncidentRecord } from '../types';

export interface SyncResultSummary {
  ok: boolean;
  message: string;
  insertedCount: number;
  updatedCount: number;
  duplicateSkippedCount: number;
  totalServerRecords: number;
  syncedAt: string | null;
  targetName?: string;
}

const LOCAL_EXPRESS_API = 'http://127.0.0.1:3001';
const SIMULATED_SERVER_STORAGE_KEY = 'ark_os_simulated_server_db_v1';

let inFlightSyncPromise: Promise<SyncResultSummary> | null = null;

interface SimulatedServerState {
  incidents: IncidentRecord[];
  lastSyncAt: string | null;
}

function readSimulatedServerDb(): SimulatedServerState {
  try {
    const raw = window.localStorage.getItem(SIMULATED_SERVER_STORAGE_KEY);
    if (!raw) return { incidents: [], lastSyncAt: null };
    const parsed = JSON.parse(raw);
    return {
      incidents: Array.isArray(parsed.incidents) ? parsed.incidents : [],
      lastSyncAt: parsed.lastSyncAt || null,
    };
  } catch {
    return { incidents: [], lastSyncAt: null };
  }
}

function writeSimulatedServerDb(state: SimulatedServerState): void {
  try {
    window.localStorage.setItem(
      SIMULATED_SERVER_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // ignore storage quota errors
  }
}

function syncWithInBrowserSimulatedServer(
  recordsToSend: IncidentRecord[]
): SyncResultSummary {
  const db = readSimulatedServerDb();
  const byId = new Map<string, IncidentRecord>(
    db.incidents.map((inc) => [inc.id, inc])
  );

  let insertedCount = 0;
  let updatedCount = 0;
  let duplicateSkippedCount = 0;
  const syncedIds: string[] = [];

  for (const record of recordsToSend) {
    const existing = byId.get(record.id);
    const syncedCopy: IncidentRecord = {
      ...record,
      syncStatus: 'synced',
    };
    if (!existing) {
      byId.set(record.id, syncedCopy);
      insertedCount++;
    } else if (
      existing.updatedAt !== record.updatedAt ||
      existing.status !== record.status
    ) {
      byId.set(record.id, syncedCopy);
      updatedCount++;
    } else {
      duplicateSkippedCount++;
    }
    syncedIds.push(record.id);
  }

  const nowIso = new Date().toISOString();
  db.incidents = Array.from(byId.values());
  db.lastSyncAt = nowIso;
  writeSimulatedServerDb(db);

  return {
    ok: true,
    message:
      recordsToSend.length === 0
        ? 'Senkronize edildi (Bekleyen yeni yerel kayıt yok, tüm kayıtlar güncel).'
        : `Senkronize edildi (${insertedCount} yeni eklendi, ${updatedCount} güncellendi, ${duplicateSkippedCount} mükerrer atlandı).`,
    insertedCount,
    updatedCount,
    duplicateSkippedCount,
    totalServerRecords: db.incidents.length,
    syncedAt: nowIso,
    targetName: 'Tarayıcı İçi Simüle Sunucu (Canlı Statik Mod)',
  };
}

async function tryRemoteEndpointSync(
  baseUrl: string,
  recordsToSend: IncidentRecord[]
): Promise<SyncResultSummary> {
  if (recordsToSend.length === 0) {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    if (!healthRes.ok) {
      throw new Error(`Sunucu yanıt vermedi (${healthRes.status})`);
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

  const response = await fetch(`${baseUrl}/api/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: recordsToSend, incidents: recordsToSend }),
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
}

async function performSyncInternal(
  sendAllForIdempotencyCheck: boolean
): Promise<SyncResultSummary> {
  if (!navigator.onLine) {
    throw new Error('Gönderilemedi, tekrar denenecek (Ağ bağlantısı yok).');
  }

  const recordsToSend = sendAllForIdempotencyCheck
    ? await getAllIncidents()
    : await getPendingIncidents();

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  try {
    // 1. Katman: Yerel geliştirme ortamında Express mockServer (127.0.0.1:3001) açıksa onu kullan
    if (isLocalhost) {
      try {
        return await tryRemoteEndpointSync(LOCAL_EXPRESS_API, recordsToSend);
      } catch {
        // 3001 kapalıysa 2. veya 3. katmana geç
      }
    }

    // 2. Katman: Vercel Serverless (/api/sync) uç noktasını dene
    try {
      return await tryRemoteEndpointSync('', recordsToSend);
    } catch {
      // Statik barındırma (veya yerel preview) ortamındaysak 3. Katmana geç
    }

    // 3. Katman: Tarayıcı İçi Simüle Sunucu Yedeği (Canlı statik URL'lerde %100 çalışır)
    const simResult = syncWithInBrowserSimulatedServer(recordsToSend);
    if (recordsToSend.length > 0) {
      await markIncidentsSynced(recordsToSend.map((r) => r.id));
    }
    return simResult;
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
