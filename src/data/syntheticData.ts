import { DashboardSnapshot } from '../types';

function formatTimeOffset(minutesAgo: number): string {
  const date = new Date(Date.now() - minutesAgo * 60 * 1000);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function createInitialSnapshot(): DashboardSnapshot {
  return {
    siteName: 'Çınarlı Vadi Konut Sitesi (Örnek Site)',
    blockCount: 6,
    unitCount: 144,
    water: {
      mainMeterM3: {
        label: 'Site Ana Su Sayacı (Günlük)',
        value: 68.4,
        unit: 'm³',
        updatedAt: formatTimeOffset(1),
        status: 'ok',
        note: 'Şebeke giriş ana hat ölçümü (Sentetik örnek veri)',
      },
      apartmentsTotalM3: {
        label: 'Daire Sayaçları Toplamı (Günlük)',
        value: 66.9,
        unit: 'm³',
        updatedAt: formatTimeOffset(2),
        status: 'ok',
        note: '144 bağımsız bölüm alt sayaç toplamı + ortak alan sulama',
      },
      tankLevelPct: {
        label: 'Su Deposu Doluluk Seviyesi',
        value: 78,
        unit: '%',
        updatedAt: formatTimeOffset(1),
        status: 'ok',
        note: 'Ana su deposu şamandıra/seviye okuması',
      },
    },
    electricity: {
      gridConsumptionKw: {
        label: 'Anlık Elektrik Tüketimi',
        value: 42.5,
        unit: 'kW',
        updatedAt: formatTimeOffset(1),
        status: 'ok',
        note: 'Ortak alanlar, hidrofor, asansör ve aydınlatma yükü',
      },
      solarGenerationKw: {
        label: 'GES (Güneş Enerjisi) Üretimi',
        value: 14.2,
        unit: 'kW',
        updatedAt: formatTimeOffset(1),
        status: 'ok',
        note: 'Çatı GES inverter anlık üretim değeri',
      },
      batterySocPct: {
        label: 'Yedek Batarya Doluluk Oranı',
        value: 85,
        unit: '%',
        updatedAt: formatTimeOffset(3),
        status: 'ok',
        note: 'Yönetim odası ve yerel ağ (modem/panel) kesintisiz güç kaynağı',
      },
      generatorStatus: {
        label: 'Jeneratör Durumu',
        value: 'Hazırda Bekliyor (Yakıt: %72)',
        unit: '',
        updatedAt: formatTimeOffset(18),
        status: 'stale',
        note: 'Son okuma 15 dakikadan eski (Eski veri örneği)',
      },
    },
    maintenanceTasks: [
      {
        id: 'BKM-101',
        title: 'B Blok Hidrofor Basınç Şalteri Kontrolü',
        location: 'B Blok Bodrum Teknik Oda',
        category: 'Su',
        status: 'Devam Ediyor',
        priority: 'Yüksek',
        updatedAt: formatTimeOffset(12),
      },
      {
        id: 'BKM-102',
        title: 'Ortak Alan Jeneratör Haftalık Boşta Çalıştırma Testi',
        location: 'Jeneratör Kabini',
        category: 'Elektrik',
        status: 'Bekliyor',
        priority: 'Orta',
        updatedAt: formatTimeOffset(45),
      },
      {
        id: 'BKM-103',
        title: 'C Blok Yağmur Suyu Izgarası Yaprak Temizliği',
        location: 'C Blok Kuzey Girişi',
        category: 'Genel',
        status: 'Tamamlandı',
        priority: 'Düşük',
        updatedAt: formatTimeOffset(90),
      },
      {
        id: 'BKM-104',
        title: 'Ana Su Deposu Klor ve Bulanıklık Rutin Ölçümü',
        location: 'Merkez Su Deposu',
        category: 'Su',
        status: 'Bekliyor',
        priority: 'Orta',
        updatedAt: formatTimeOffset(30),
      },
    ],
  };
}
