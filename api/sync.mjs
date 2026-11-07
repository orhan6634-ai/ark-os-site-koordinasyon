function validateIncidentRecord(item) {
  if (!item || typeof item !== 'object') return 'Geçersiz kayıt formatı.';
  if (typeof item.id !== 'string' || item.id.trim().length < 3 || item.id.length > 80) {
    return 'Geçersiz kayıt kimliği (id).';
  }
  if (typeof item.type !== 'string' || item.type.trim().length < 3) {
    return 'Geçersiz kayıt türü.';
  }
  if (!['Düşük', 'Orta', 'Yüksek', 'Kritik'].includes(item.priority)) {
    return 'Geçersiz öncelik değeri.';
  }
  if (typeof item.location !== 'string' || item.location.trim().length < 2 || item.location.length > 150) {
    return 'Geçersiz konum bilgisi.';
  }
  if (typeof item.description !== 'string' || item.description.trim().length < 5 || item.description.length > 500) {
    return 'Açıklama 5 ile 500 karakter arasında olmalıdır.';
  }
  if (!['Açık', 'İnceleniyor', 'Çözüldü'].includes(item.status)) {
    return 'Geçersiz durum değeri.';
  }
  return null;
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Yalnızca POST desteklenir.' });
  }

  const payload = req.body;
  if (!payload || !Array.isArray(payload.records)) {
    return res.status(400).json({
      ok: false,
      error: 'Geçersiz istek: records dizisi zorunludur.',
    });
  }

  if (!Array.isArray(globalThis.__ARK_SERVER_INCIDENTS__)) {
    globalThis.__ARK_SERVER_INCIDENTS__ = [];
  }

  const byId = new Map(globalThis.__ARK_SERVER_INCIDENTS__.map((inc) => [inc.id, inc]));
  let insertedCount = 0;
  let updatedCount = 0;
  let duplicateSkippedCount = 0;
  const syncedIds = [];

  for (const record of payload.records) {
    const validationErr = validateIncidentRecord(record);
    if (validationErr) {
      return res.status(400).json({
        ok: false,
        error: `Kayıt doğrulama hatası (${record?.id || 'bilinmiyor'}): ${validationErr}`,
      });
    }

    const sanitized = {
      id: record.id.trim(),
      type: record.type.trim(),
      priority: record.priority,
      location: record.location.trim(),
      description: record.description.trim(),
      createdAt: record.createdAt || new Date().toISOString(),
      updatedAt: record.updatedAt || new Date().toISOString(),
      status: record.status,
      createdOffline: Boolean(record.createdOffline),
      syncStatus: 'synced',
      playbookId: typeof record.playbookId === 'string' ? record.playbookId : undefined,
      subSteps: Array.isArray(record.subSteps) ? record.subSteps : undefined,
      serverSyncedAt: new Date().toISOString(),
    };

    const existing = byId.get(sanitized.id);
    if (!existing) {
      byId.set(sanitized.id, sanitized);
      insertedCount++;
    } else if (existing.updatedAt !== sanitized.updatedAt || existing.status !== sanitized.status) {
      byId.set(sanitized.id, sanitized);
      updatedCount++;
    } else {
      duplicateSkippedCount++;
    }

    syncedIds.push(sanitized.id);
  }

  const nowIso = new Date().toISOString();
  globalThis.__ARK_SERVER_INCIDENTS__ = Array.from(byId.values());
  globalThis.__ARK_SERVER_LAST_SYNC__ = nowIso;

  return res.status(200).json({
    ok: true,
    syncedIds,
    insertedCount,
    updatedCount,
    duplicateSkippedCount,
    totalServerRecords: globalThis.__ARK_SERVER_INCIDENTS__.length,
    syncedAt: nowIso,
  });
}
