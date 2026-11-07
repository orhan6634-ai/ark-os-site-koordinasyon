export type SystemMode = 'normal' | 'crisis' | 'recovery';

export type ConnectionState = 'online' | 'offline' | 'syncing';

export type DataStatus = 'ok' | 'stale' | 'missing';

export interface MetricReading<T = number | string> {
  label: string;
  value: T | null;
  unit: string;
  updatedAt: string | null;
  status: DataStatus;
  note?: string;
}

export interface MaintenanceTask {
  id: string;
  title: string;
  location: string;
  category: 'Su' | 'Elektrik' | 'Genel';
  status: 'Bekliyor' | 'Devam Ediyor' | 'Tamamlandı';
  priority: 'Düşük' | 'Orta' | 'Yüksek';
  updatedAt: string;
}

export interface DashboardSnapshot {
  siteName: string;
  blockCount: number;
  unitCount: number;
  water: {
    mainMeterM3: MetricReading<number>;
    apartmentsTotalM3: MetricReading<number>;
    tankLevelPct: MetricReading<number>;
  };
  electricity: {
    gridConsumptionKw: MetricReading<number>;
    solarGenerationKw: MetricReading<number>;
    batterySocPct: MetricReading<number>;
    generatorStatus: MetricReading<string>;
  };
  maintenanceTasks: MaintenanceTask[];
}

export type IncidentRecordType =
  | 'Arıza / Hasar Bildirimi'
  | 'Su / Enerji Kesintisi'
  | 'Temel İhtiyaç Talebi'
  | 'Bilgi / Koordinasyon Notu';

export type IncidentPriority = 'Düşük' | 'Orta' | 'Yüksek' | 'Kritik';

export type IncidentStatus = 'Açık' | 'İnceleniyor' | 'Çözüldü';

export interface IncidentRecord {
  id: string;
  type: IncidentRecordType;
  priority: IncidentPriority;
  location: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  status: IncidentStatus;
  createdOffline: boolean;
  syncStatus: 'pending' | 'synced';
}

export type PlaybookId =
  | 'heatwave'
  | 'flash_flood'
  | 'drought'
  | 'wildfire_smoke'
  | 'long_power_outage';

export interface PlaybookStepDefinition {
  stepId: string;
  order: number;
  title: string;
  detail: string;
  defaultLocation: string;
}

export interface PlaybookDefinition {
  id: PlaybookId;
  title: string;
  subtitle: string;
  recommendedPriority: IncidentPriority;
  steps: PlaybookStepDefinition[];
}

export interface PlaybookStepState {
  key: string; // `${playbookId}:${stepId}`
  playbookId: PlaybookId;
  stepId: string;
  completed: boolean;
  completedAt: string | null;
  incidentId?: string;
}
