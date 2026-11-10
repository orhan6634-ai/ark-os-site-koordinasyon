let memoryStore = {
  incidents: [],
  lastUpdatedAt: null,
};

export default async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        ok: true,
        count: memoryStore.incidents.length,
        lastUpdatedAt: memoryStore.lastUpdatedAt,
        incidents: memoryStore.incidents,
      }),
      { status: 200, headers }
    );
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const incoming = Array.isArray(body?.incidents)
        ? body.incidents
        : Array.isArray(body?.records)
        ? body.records
        : [];

      const byId = new Map();
      for (const item of memoryStore.incidents) {
        if (item && typeof item.id === 'string') {
          byId.set(item.id, item);
        }
      }

      let insertedCount = 0;
      let updatedCount = 0;
      let duplicateSkippedCount = 0;
      const syncedIds = [];

      for (const raw of incoming) {
        if (!raw || typeof raw.id !== 'string' || !raw.id.trim()) continue;
        const cleanId = raw.id.trim();
        const existing = byId.get(cleanId);

        const normalized = {
          id: cleanId,
          type: String(raw.type || 'Arıza / Hasar Bildirimi'),
          priority: String(raw.priority || 'Orta'),
          location: String(raw.location || 'Belirtilmedi').slice(0, 120),
          description: String(raw.description || '').slice(0, 500),
          status: String(raw.status || 'Açık'),
          createdAt: raw.createdAt || new Date().toISOString(),
          updatedAt: raw.updatedAt || new Date().toISOString(),
          createdOffline: Boolean(raw.createdOffline),
          playbookId: raw.playbookId || undefined,
          stepId: raw.stepId || undefined,
          subSteps: Array.isArray(raw.subSteps) ? raw.subSteps : undefined,
          syncStatus: 'synced',
          syncedServerAt: new Date().toISOString(),
        };

        if (!existing) {
          byId.set(cleanId, normalized);
          insertedCount += 1;
          syncedIds.push(cleanId);
        } else {
          const subStepsChanged =
            JSON.stringify(existing.subSteps || []) !==
            JSON.stringify(normalized.subSteps || []);

          if (
            existing.updatedAt !== normalized.updatedAt ||
            existing.status !== normalized.status ||
            existing.description !== normalized.description ||
            subStepsChanged
          ) {
            byId.set(cleanId, {
              ...existing,
              ...normalized,
              syncedServerAt: new Date().toISOString(),
            });
            updatedCount += 1;
          } else {
            duplicateSkippedCount += 1;
          }
          syncedIds.push(cleanId);
        }
      }

      memoryStore.incidents = Array.from(byId.values()).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      memoryStore.lastUpdatedAt = new Date().toISOString();

      return new Response(
        JSON.stringify({
          ok: true,
          syncedIds,
          insertedCount,
          updatedCount,
          duplicateSkippedCount,
          totalServerRecords: memoryStore.incidents.length,
          syncedAt: memoryStore.lastUpdatedAt,
        }),
        { status: 200, headers }
      );
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Sunucu hatası.' }),
        { status: 500, headers }
      );
    }
  }

  return new Response(
    JSON.stringify({ ok: false, error: 'Desteklenmeyen HTTP metodu.' }),
    { status: 405, headers }
  );
};
