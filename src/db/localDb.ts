import Dexie, { Table } from 'dexie';
import {
  IncidentRecord,
  IncidentStatus,
  PlaybookId,
  PlaybookStepState,
  PlaybookSubStepLog,
} from '../types';

export class ArkOsLocalDatabase extends Dexie {
  incidents!: Table<IncidentRecord, string>;
  playbookSteps!: Table<PlaybookStepState, string>;

  constructor() {
    super('ArkOsLocalDatabase');
    this.version(1).stores({
      incidents: 'id, type, priority, status, createdAt, syncStatus',
    });
    this.version(2).stores({
      incidents: 'id, type, priority, status, createdAt, syncStatus',
      playbookSteps: 'key, playbookId, completed',
    });
  }
}

export const db = new ArkOsLocalDatabase();

const INITIAL_SAMPLE_INCIDENTS: IncidentRecord[] = [
  {
    id: 'OLAY-ORNEK-01',
    type: 'Arıza / Hasar Bildirimi',
    priority: 'Yüksek',
    location: 'B Blok - Bodrum Hidrofor Odası',
    description:
      'Örnek kayıt: Yedek hidrofor pompasında titreşim ve basınç dalgalanması gözlemlendi, teknik ekip bilgilendirildi.',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    status: 'İnceleniyor',
    createdOffline: false,
    syncStatus: 'pending',
  },
  {
    id: 'OLAY-ORNEK-02',
    type: 'Temel İhtiyaç Talebi',
    priority: 'Orta',
    location: 'A Blok - Daire 4 (Yaşlı Sakin)',
    description:
      'Örnek kayıt: Asansör bakımı süresince içme suyu damacanasının kata çıkarılması için site görevlisi desteği talep edildi.',
    createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    status: 'Açık',
    createdOffline: false,
    syncStatus: 'pending',
  },
];

export async function ensureInitialIncidents(): Promise<IncidentRecord[]> {
  const count = await db.incidents.count();
  if (count === 0) {
    await db.incidents.bulkPut(INITIAL_SAMPLE_INCIDENTS);
  } else {
    // Eski sürümde ayrı ayrı oluşmuş "[Oyun Planı: ...]" satırları varsa gürültüyü önlemek için temizle
    const all = await db.incidents.toArray();
    const legacyNoiseIds = all
      .filter(
        (item) =>
          !item.playbookId &&
          !item.id.startsWith('OLAY-PB-') &&
          item.description.startsWith('[Oyun Planı:')
      )
      .map((item) => item.id);
    if (legacyNoiseIds.length > 0) {
      await db.incidents.bulkDelete(legacyNoiseIds);
    }
  }
  return getAllIncidents();
}

export async function getAllIncidents(): Promise<IncidentRecord[]> {
  const list = await db.incidents.toArray();
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function addIncidentRecord(
  record: Omit<IncidentRecord, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
): Promise<IncidentRecord> {
  const nowIso = new Date().toISOString();
  const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const newRecord: IncidentRecord = {
    ...record,
    id: `OLAY-${Date.now()}-${uniqueSuffix}`,
    createdAt: nowIso,
    updatedAt: nowIso,
    syncStatus: 'pending',
  };
  await db.incidents.put(newRecord);
  return newRecord;
}

export async function updateIncidentStatus(
  id: string,
  status: IncidentStatus
): Promise<void> {
  await db.incidents.update(id, {
    status,
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  });
}

export async function getPendingIncidents(): Promise<IncidentRecord[]> {
  return db.incidents
    .filter(
      (item) => item.syncStatus === 'pending' || item.syncStatus === 'failed'
    )
    .toArray();
}

export async function markIncidentsSynced(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await db.transaction('rw', db.incidents, async () => {
    for (const id of ids) {
      await db.incidents.update(id, { syncStatus: 'synced' });
    }
  });
}

export async function markIncidentsFailed(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await db.transaction('rw', db.incidents, async () => {
    for (const id of ids) {
      await db.incidents.update(id, { syncStatus: 'failed' });
    }
  });
}

export async function getPlaybookStepStates(
  playbookId?: PlaybookId
): Promise<Record<string, PlaybookStepState>> {
  const rows = playbookId
    ? await db.playbookSteps.where('playbookId').equals(playbookId).toArray()
    : await db.playbookSteps.toArray();
  const map: Record<string, PlaybookStepState> = {};
  for (const r of rows) {
    map[r.key] = r;
  }
  return map;
}

// FAZ 3.3: Bir playbook çalıştırması = tek olay kaydı; adımlar o kaydın içinde zaman damgalı alt satırlar
export async function togglePlaybookStepWithIncident(params: {
  playbookId: PlaybookId;
  playbookTitle: string;
  stepId: string;
  stepOrder: number;
  stepTitle: string;
  defaultLocation: string;
  completed: boolean;
  isOffline: boolean;
}): Promise<{ stepState: PlaybookStepState; createdIncident?: IncidentRecord }> {
  const key = `${params.playbookId}:${params.stepId}`;
  const nowIso = new Date().toISOString();
  const playbookIncidentId = `OLAY-PB-${params.playbookId.toUpperCase()}`;

  const existingIncident = await db.incidents.get(playbookIncidentId);
  const currentSubSteps: PlaybookSubStepLog[] = existingIncident?.subSteps
    ? [...existingIncident.subSteps]
    : [];

  if (params.completed) {
    const filtered = currentSubSteps.filter((s) => s.stepId !== params.stepId);
    filtered.push({
      stepId: params.stepId,
      order: params.stepOrder,
      title: params.stepTitle,
      location: params.defaultLocation,
      completedAt: nowIso,
    });
    filtered.sort((a, b) => a.order - b.order);

    const updatedIncident: IncidentRecord = {
      id: playbookIncidentId,
      type: 'Bilgi / Koordinasyon Notu',
      priority: 'Yüksek',
      location: existingIncident?.location || params.defaultLocation,
      description: `Oyun Planı Çalıştırması: ${params.playbookTitle} (${filtered.length} adım tamamlandı)`,
      createdAt: existingIncident?.createdAt || nowIso,
      updatedAt: nowIso,
      status: filtered.length >= 4 ? 'Çözüldü' : 'İnceleniyor',
      createdOffline: existingIncident?.createdOffline || params.isOffline,
      syncStatus: 'pending',
      playbookId: params.playbookId,
      subSteps: filtered,
    };

    await db.incidents.put(updatedIncident);

    const state: PlaybookStepState = {
      key,
      playbookId: params.playbookId,
      stepId: params.stepId,
      completed: true,
      completedAt: nowIso,
      incidentId: playbookIncidentId,
    };
    await db.playbookSteps.put(state);
    return { stepState: state, createdIncident: updatedIncident };
  } else {
    const remaining = currentSubSteps.filter((s) => s.stepId !== params.stepId);

    if (remaining.length === 0) {
      if (existingIncident) {
        await db.incidents.delete(playbookIncidentId);
      }
    } else if (existingIncident) {
      const updatedIncident: IncidentRecord = {
        ...existingIncident,
        description: `Oyun Planı Çalıştırması: ${params.playbookTitle} (${remaining.length} adım tamamlandı)`,
        updatedAt: nowIso,
        status: remaining.length >= 4 ? 'Çözüldü' : 'İnceleniyor',
        syncStatus: 'pending',
        subSteps: remaining,
      };
      await db.incidents.put(updatedIncident);
    }

    const state: PlaybookStepState = {
      key,
      playbookId: params.playbookId,
      stepId: params.stepId,
      completed: false,
      completedAt: null,
    };
    await db.playbookSteps.put(state);
    return { stepState: state };
  }
}
