import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');
const PORT = Number(process.env.PORT || 3001);

const app = express();
app.use(express.json({ limit: '256kb' }));

// CORS headers for direct or proxied local access
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

function readServerDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      incidents: [],
      lastSyncAt: null,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.incidents)) parsed.incidents = [];
    return parsed;
  } catch {
    return { incidents: [], lastSyncAt: null };
  }
}

function writeServerDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

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

app.get('/api/health', (_req, res) => {
  const db = readServerDb();
  res.json({
    ok: true,
    serverName: 'ARK-OS Yerel Sahte Sunucu (Express + JSON)',
    storedIncidentCount: db.incidents.length,
    lastSyncAt: db.lastSyncAt,
  });
});

app.get('/api/incidents', (_req, res) => {
  const db = readServerDb();
  res.json({
    ok: true,
    incidents: db.incidents,
    lastSyncAt: db.lastSyncAt,
  });
});

// Kural #7: Mükerrer kayıt oluşmasını önleyen (Idempotent upsert by id) senkronizasyon uç noktası
app.post('/api/sync', (req, res) => {
  const payload = req.body;
  if (!payload || !Array.isArray(payload.records)) {
    return res.status(400).json({
      ok: false,
      error: 'Geçersiz istek: records dizisi zorunludur.',
    });
  }

  const db = readServerDb();
  const byId = new Map(db.incidents.map((inc) => [inc.id, inc]));

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
      // Mükerrer gönderim: Aynı id ve aynı updatedAt/status zaten sunucuda var -> yeni kopya oluşturma!
      duplicateSkippedCount++;
    }

    syncedIds.push(sanitized.id);
  }

  const nowIso = new Date().toISOString();
  db.incidents = Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  db.lastSyncAt = nowIso;
  writeServerDb(db);

  return res.json({
    ok: true,
    syncedIds,
    insertedCount,
    updatedCount,
    duplicateSkippedCount,
    totalServerRecords: db.incidents.length,
    syncedAt: nowIso,
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[ARK-OS SAHTE SUNUCU] http://127.0.0.1:${PORT} adresinde çalışıyor (Kalıcı dosya: ${DB_FILE})`);
});
