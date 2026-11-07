import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckSquare,
  CloudRain,
  Flame,
  Square,
  Sun,
  TrendingDown,
  ZapOff,
} from 'lucide-react';
import { PLAYBOOK_DISCLAIMER, PLAYBOOKS } from '../data/playbooksData';
import {
  getPlaybookStepStates,
  togglePlaybookStepWithIncident,
} from '../db/localDb';
import { PlaybookDefinition, PlaybookId, PlaybookStepState } from '../types';

function getPlaybookIcon(id: PlaybookId) {
  switch (id) {
    case 'heatwave':
      return <Sun className="h-4 w-4 text-orange-600" />;
    case 'flash_flood':
      return <CloudRain className="h-4 w-4 text-blue-600" />;
    case 'drought':
      return <TrendingDown className="h-4 w-4 text-amber-600" />;
    case 'wildfire_smoke':
      return <Flame className="h-4 w-4 text-red-600" />;
    case 'long_power_outage':
      return <ZapOff className="h-4 w-4 text-purple-600" />;
  }
}

function formatTimeTr(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function PlaybookSection({
  isOffline,
  onStepRecorded,
  externalSelectedPlaybookId,
}: {
  isOffline: boolean;
  onStepRecorded: () => Promise<void>;
  externalSelectedPlaybookId?: PlaybookId | null;
}) {
  const [selectedPlaybookId, setSelectedPlaybookId] =
    useState<PlaybookId>('heatwave');
  const [stepStates, setStepStates] = useState<
    Record<string, PlaybookStepState>
  >({});
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (externalSelectedPlaybookId) {
      setSelectedPlaybookId(externalSelectedPlaybookId);
    }
  }, [externalSelectedPlaybookId]);

  useEffect(() => {
    let active = true;
    getPlaybookStepStates().then((map) => {
      if (active) setStepStates(map);
    });
    return () => {
      active = false;
    };
  }, []);

  const currentPlaybook: PlaybookDefinition =
    PLAYBOOKS.find((p) => p.id === selectedPlaybookId) || PLAYBOOKS[0];

  const handleToggleStep = async (
    playbook: PlaybookDefinition,
    step: PlaybookDefinition['steps'][number]
  ) => {
    const key = `${playbook.id}:${step.stepId}`;
    const currentlyCompleted = Boolean(stepStates[key]?.completed);
    const nextCompleted = !currentlyCompleted;

    const result = await togglePlaybookStepWithIncident({
      playbookId: playbook.id,
      playbookTitle: playbook.title,
      stepId: step.stepId,
      stepOrder: step.order,
      stepTitle: step.title,
      defaultLocation: step.defaultLocation,
      completed: nextCompleted,
      isOffline,
    });

    const refreshed = await getPlaybookStepStates();
    setStepStates(refreshed);

    if (nextCompleted && result.createdIncident) {
      setFeedbackMsg(
        `"${step.title}" adımı işaretlendi ve Olay/İhtiyaç Kaydı listesine (${result.createdIncident.id}) otomatik olarak kaydedildi.`
      );
    } else {
      setFeedbackMsg(`"${step.title}" adımının işareti kaldırıldı.`);
    }

    await onStepRecorded();
  };

  const completedInCurrent = currentPlaybook.steps.filter(
    (s) => stepStates[`${currentPlaybook.id}:${s.stepId}`]?.completed
  ).length;

  return (
    <section
      aria-label="Kriz Oyun Planları (Playbook)"
      data-testid="playbook-section"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
            <BookOpenCheck className="h-5 w-5 text-indigo-600" />
            Kriz Oyun Planları (Playbook Kontrol Listeleri)
          </h2>
          <p className="text-xs text-slate-600">
            Senaryo seçip adımları işaretlediğinizde her adım zaman damgasıyla{' '}
            <strong>Olay ve İhtiyaç Kaydı</strong> tablosuna otomatik olarak düşer.
          </p>
        </div>

        <span className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-900">
          Tamamlanan Adım: {completedInCurrent} / {currentPlaybook.steps.length}
        </span>
      </div>

      {/* 5 SENARYO SEÇİM SEKME BUTONLARI */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PLAYBOOKS.map((pb) => {
          const isSelected = pb.id === selectedPlaybookId;
          const doneCount = pb.steps.filter(
            (s) => stepStates[`${pb.id}:${s.stepId}`]?.completed
          ).length;

          return (
            <button
              key={pb.id}
              type="button"
              data-testid={`playbook-tab-${pb.id}`}
              onClick={() => {
                setSelectedPlaybookId(pb.id);
                setFeedbackMsg(null);
              }}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {getPlaybookIcon(pb.id)}
              <span>{pb.title}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] ${
                  isSelected
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {doneCount}/{pb.steps.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* SEÇİLİ PLAYBOOK DETAYI VE ADIMLARI */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 sm:text-base">
              {currentPlaybook.title}
            </h3>
            <p className="text-xs text-slate-600">{currentPlaybook.subtitle}</p>
          </div>
          <span className="rounded bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
            Önerilen Öncelik: {currentPlaybook.recommendedPriority}
          </span>
        </div>

        {feedbackMsg && (
          <div
            data-testid="playbook-step-feedback"
            className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900"
          >
            {feedbackMsg}
          </div>
        )}

        <div className="space-y-2.5">
          {currentPlaybook.steps.map((step) => {
            const key = `${currentPlaybook.id}:${step.stepId}`;
            const st = stepStates[key];
            const isDone = Boolean(st?.completed);

            return (
              <div
                key={step.stepId}
                className={`flex items-start justify-between gap-3 rounded-lg border p-3 transition ${
                  isDone
                    ? 'border-emerald-300 bg-emerald-50/60'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <button
                  type="button"
                  data-testid={`playbook-step-btn-${step.stepId}`}
                  onClick={() => handleToggleStep(currentPlaybook, step)}
                  className="flex flex-1 items-start gap-3 text-left"
                >
                  <span className="mt-0.5 text-indigo-600">
                    {isDone ? (
                      <CheckSquare className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-400" />
                    )}
                  </span>
                  <div>
                    <div
                      className={`text-xs font-bold sm:text-sm ${
                        isDone
                          ? 'line-through text-emerald-900'
                          : 'text-slate-900'
                      }`}
                    >
                      Adım {step.order}: {step.title}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {step.detail}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>İlgili Alan: {step.defaultLocation}</span>
                      {isDone && st?.completedAt && (
                        <span className="font-semibold text-emerald-800">
                          • İşaretlendi: {formatTimeTr(st.completedAt)}
                        </span>
                      )}
                      {isDone && st?.incidentId && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-900">
                          Kayıt: {st.incidentId}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* ZORUNLU UYARI METNİ */}
        <div
          data-testid="playbook-disclaimer"
          className="mt-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-950"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
          <span>{PLAYBOOK_DISCLAIMER}</span>
        </div>
      </div>
    </section>
  );
}

export default PlaybookSection;
