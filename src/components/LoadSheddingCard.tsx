import React, { useState } from 'react';
import {
  CheckCircle2,
  ShieldAlert,
  Sliders,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { addIncidentRecord } from '../db/localDb';

const STAFF_ROLES = [
  'Site Yöneticisi',
  'Teknik Sorumlu',
  'Güvenlik Vardiya Amiri',
] as const;

export function LoadSheddingCard({
  isOffline,
  onDecisionRecorded,
}: {
  isOffline: boolean;
  onDecisionRecorded: () => Promise<void>;
}) {
  const [selectedRole, setSelectedRole] = useState<string>(STAFF_ROLES[0]);
  const [staffName, setStaffName] = useState<string>('');
  const [lastDecision, setLastDecision] = useState<{
    action: 'Onaylandı' | 'Reddedildi';
    actor: string;
    timestamp: string;
    incidentId: string;
  } | null>(null);

  const handleDecision = async (action: 'Onaylandı' | 'Reddedildi') => {
    const trimmedName = staffName.trim();
    const actorLabel = trimmedName
      ? `${selectedRole} (${trimmedName})`
      : selectedRole;
    const nowFormatted = new Date().toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const record = await addIncidentRecord({
      type: 'Bilgi / Koordinasyon Notu',
      priority: 'Yüksek',
      location: 'Jeneratör / Trafo Alanı',
      description: `[Yük Azaltma Önerisi: ${action.toUpperCase()}] Kritik olmayan yüklerin (ortak alan klimaları, havuz pompası) azaltılması önerisi ${actorLabel} tarafından (${nowFormatted}) ${action.toLowerCase()}. (Onay simülasyonudur, gerçek cihaz kontrolü yoktur.)`,
      status: action === 'Onaylandı' ? 'İnceleniyor' : 'Çözüldü',
      createdOffline: isOffline,
    });

    setLastDecision({
      action,
      actor: actorLabel,
      timestamp: nowFormatted,
      incidentId: record.id,
    });

    await onDecisionRecorded();
  };

  return (
    <section
      aria-label="Yük Azaltma Önerisi"
      data-testid="load-shedding-card"
      className="rounded-xl border-2 border-amber-500 bg-amber-50/90 p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-amber-300 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Sliders className="h-5 w-5 text-amber-800" />
            <h3 className="text-base font-extrabold text-slate-950">
              Öneri: kritik olmayan yükleri azaltmayı değerlendirin (ortak alan
              klimaları, havuz pompası)
            </h3>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-800 sm:text-sm">
            Kriz / kesinti modunda yedek batarya ve jeneratör yakıt süresini
            korumak için kritik olmayan ortak alan yüklerinin manuel olarak
            devre dışı bırakılması değerlendirilebilir.
          </p>
        </div>

        <span
          data-testid="load-shedding-sim-notice"
          className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-white px-2.5 py-1 text-xs font-extrabold text-amber-950"
        >
          <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
          Bu bir onay simülasyonudur, gerçek cihaz kontrolü yoktur.
        </span>
      </div>

      {/* Görevli Seçimi ve Onayla / Reddet Kontrolleri */}
      <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label
            htmlFor="load-shedding-role"
            className="mb-1 block text-xs font-bold text-slate-800"
          >
            Kararı Veren Görevli Rolü
          </label>
          <select
            id="load-shedding-role"
            data-testid="load-shedding-role-select"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 sm:text-sm"
          >
            {STAFF_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="load-shedding-staff-name"
            className="mb-1 block text-xs font-bold text-slate-800"
          >
            Görevli Adı (İsteğe bağlı)
          </label>
          <input
            id="load-shedding-staff-name"
            data-testid="load-shedding-staff-input"
            type="text"
            maxLength={60}
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            placeholder="Örn: Nöbetçi Tekniker"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 sm:text-sm"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="button"
            data-testid="approve-load-shedding-btn"
            onClick={() => handleDecision('Onaylandı')}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-800 sm:text-sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            Onayla
          </button>
          <button
            type="button"
            data-testid="reject-load-shedding-btn"
            onClick={() => handleDecision('Reddedildi')}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-slate-900 sm:text-sm"
          >
            <XCircle className="h-4 w-4" />
            Reddet
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs font-semibold text-slate-700">
        Not: Sistem kendi başına hiçbir şalteri veya cihazı kapatmaz. Verilen
        karar, kim tarafından ve ne zaman verildiğiyle birlikte Olay Günlüğüne
        kaydedilir.
      </p>

      {lastDecision && (
        <div
          data-testid="load-shedding-decision-feedback"
          className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-400 bg-white px-3 py-2 text-xs font-bold text-slate-900"
        >
          <span className="flex items-center gap-1.5">
            <UserCheck className="h-4 w-4 text-emerald-700" />
            Karar Olay Günlüğüne işlendi: <strong>{lastDecision.action}</strong>{' '}
            • Yetkili: <strong>{lastDecision.actor}</strong> • Saat:{' '}
            {lastDecision.timestamp}
          </span>
          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-800">
            {lastDecision.incidentId}
          </span>
        </div>
      )}
    </section>
  );
}

export default LoadSheddingCard;
