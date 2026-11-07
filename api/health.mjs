export default function handler(_req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    ok: true,
    serverName: 'ARK-OS Vercel Serverless Uç Noktası (Sentetik Örnek Sunucu)',
    storedIncidentCount: globalThis.__ARK_SERVER_INCIDENTS__?.length || 2,
    lastSyncAt: globalThis.__ARK_SERVER_LAST_SYNC__ || new Date().toISOString(),
  });
}
