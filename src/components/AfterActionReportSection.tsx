import React, { useEffect, useState } from 'react';
import {
  Clock,
  Download,
  FileText,
  Printer,
} from 'lucide-react';
import { getAllIncidents } from '../db/localDb';
import { IncidentRecord } from '../types';

function formatDateTimeTr(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function AfterActionReportSection({
  siteName,
  refreshToken,
}: {
  siteName: string;
  refreshToken: number;
}) {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>('ALL');

  useEffect(() => {
    let active = true;
    getAllIncidents().then((list) => {
      if (active) {
        // Kronolojik sıralama (eskiden yeniye zaman çizelgesi)
        const chronological = [...list].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setIncidents(chronological);
      }
    });
    return () => {
      active = false;
    };
  }, [refreshToken]);

  const timelineItems =
    selectedId === 'ALL'
      ? incidents
      : incidents.filter((item) => item.id === selectedId);

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportTxt = () => {
    const lines: string[] = [
      '====================================================================',
      `ARK-OS OLAY SONRASI ZAMAN ÇİZELGESİ RAPORU (ÖRNEK VERİ)`,
      `Site: ${siteName}`,
      `Rapor Üretim Zamanı: ${formatDateTimeTr(new Date().toISOString())}`,
      `Kapsam: ${
        selectedId === 'ALL'
          ? `Tüm Olay Zaman Çizelgesi (${timelineItems.length} Kayıt)`
          : `Seçili Olay (${selectedId})`
      }`,
      'Not: Bu rapor karar destek ve koordinasyon kaydıdır; resmî kurum raporu yerine geçmez.',
      '====================================================================',
      '',
    ];

    timelineItems.forEach((item, idx) => {
      lines.push(
        `${idx + 1}. [${formatDateTimeTr(item.createdAt)}] ${item.id} | ${item.type}`
      );
      lines.push(
        `   Öncelik: ${item.priority} | Durum: ${item.status} | Konum: ${item.location}`
      );
      lines.push(
        `   Kayıt Ortamı: ${
          item.createdOffline ? 'Çevrimdışı (IndexedDB)' : 'Çevrimiçi'
        } | Senkronizasyon: ${
          item.syncStatus === 'synced' ? 'Senkronize edildi' : 'Bekliyor'
        }`
      );
      lines.push(`   Açıklama: ${item.description}`);
      lines.push(
        `   Son Güncelleme: ${formatDateTimeTr(item.updatedAt)}`
      );
      lines.push('--------------------------------------------------------------------');
    });

    const blob = new Blob([lines.join('\n')], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ark-os-olay-raporu-${selectedId.toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-label="Olay Sonrası Rapor"
      data-testid="after-action-report-section"
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
            <FileText className="h-5 w-5 text-slate-700" />
            Olay Sonrası Rapor ve Zaman Çizelgesi (Yazdırılabilir / Dışa Aktarılabilir)
          </h2>
          <p className="text-xs text-slate-600">
            Seçilen olayın veya tüm kriz sürecinin kronolojik zaman çizelgesini
            yazdırabilir ya da metin (<code>.txt</code>) dosyası olarak dışa
            aktarabilirsiniz.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <select
            aria-label="Raporlanacak Olay Seçimi"
            data-testid="report-incident-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
          >
            <option value="ALL">
              Tüm Olayların Zaman Çizelgesi ({incidents.length} kayıt)
            </option>
            {incidents.map((inc) => (
              <option key={inc.id} value={inc.id}>
                {inc.id} — {inc.type} ({inc.location})
              </option>
            ))}
          </select>

          <button
            type="button"
            data-testid="export-report-btn"
            onClick={handleExportTxt}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100"
          >
            <Download className="h-3.5 w-3.5 text-indigo-600" />
            Raporu Dışa Aktar (.TXT)
          </button>

          <button
            type="button"
            data-testid="print-report-btn"
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
          >
            <Printer className="h-3.5 w-3.5" />
            Yazdır / PDF Kaydet
          </button>
        </div>
      </div>

      {/* ZAMAN ÇİZELGESİ LİSTESİ */}
      <div
        data-testid="report-timeline-list"
        className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 text-xs text-slate-600">
          <span>
            <strong>Rapor Kapsamı:</strong>{' '}
            {selectedId === 'ALL'
              ? `Kronolojik Tüm Kayıtlar (${timelineItems.length} olay)`
              : `Tekil Olay İncelemesi (${selectedId})`}
          </span>
          <span className="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            Örnek veri
          </span>
        </div>

        {timelineItems.length === 0 ? (
          <p className="py-3 text-center text-xs text-slate-500">
            Raporlanacak olay kaydı bulunamadı.
          </p>
        ) : (
          <ol className="relative ml-3 border-l-2 border-indigo-200 space-y-4 pl-4">
            {timelineItems.map((item, idx) => (
              <li key={item.id} className="relative">
                <span className="absolute -left-[21px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-indigo-600 ring-4 ring-white" />
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-indigo-700">
                        #{idx + 1} • {formatDateTimeTr(item.createdAt)}
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                        {item.id}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                        Öncelik: {item.priority}
                      </span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                        Durum: {item.status}
                      </span>
                    </div>
                  </div>

                  <p className="mt-1.5 text-xs text-slate-800">
                    <strong>Konum:</strong> {item.location} —{' '}
                    <strong>Açıklama:</strong> {item.description}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Son Güncelleme: {formatDateTimeTr(item.updatedAt)}
                    </span>
                    <span>
                      • Kayıt Ortamı:{' '}
                      {item.createdOffline
                        ? 'Çevrimdışı (IndexedDB)'
                        : 'Çevrimiçi'}
                    </span>
                    <span>
                      • Sunucu Durumu:{' '}
                      {item.syncStatus === 'synced'
                        ? 'Senkronize edildi'
                        : 'Senkronizasyon bekliyor'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

export default AfterActionReportSection;
