import React, { useEffect, useState } from 'react';
import {
  Download,
  FileCode,
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
  activeAnomalyCount = 0,
}: {
  siteName: string;
  refreshToken: number;
  activeAnomalyCount?: number;
}) {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>('ALL');
  const [reportTimestamp, setReportTimestamp] = useState<string>(() =>
    formatDateTimeTr(new Date().toISOString())
  );

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
        setReportTimestamp(formatDateTimeTr(new Date().toISOString()));
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

  const totalCount = timelineItems.length;
  const openCount = timelineItems.filter((i) => i.status !== 'Çözüldü').length;
  const closedCount = timelineItems.filter((i) => i.status === 'Çözüldü').length;
  const pendingSyncCount = timelineItems.filter(
    (i) => i.syncStatus === 'pending' || i.syncStatus === 'failed'
  ).length;

  const handlePrintReport = () => {
    setReportTimestamp(formatDateTimeTr(new Date().toISOString()));
    window.print();
  };

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportTxt = () => {
    const nowStr = formatDateTimeTr(new Date().toISOString());
    const lines: string[] = [
      '====================================================================',
      'ARK-OS OLAY SONRASI RAPORU',
      `Site Adı: ${siteName}`,
      `Rapor Tarihi / Saati: ${nowStr}`,
      '--------------------------------------------------------------------',
      'ÖZET METRİKLER:',
      `- Toplam Olay: ${totalCount}`,
      `- Açık / Kapalı (Çözüldü): ${openCount} Açık / ${closedCount} Çözüldü`,
      `- Bekleyen Senkronizasyon: ${pendingSyncCount}`,
      `- Açık Anomali / Eksik Veri Sayısı: ${activeAnomalyCount}`,
      '====================================================================',
      '',
      'OLAY ZAMAN ÇİZELGESİ:',
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
        `   Senkronizasyon: ${
          item.syncStatus === 'synced'
            ? 'Senkronize edildi'
            : item.syncStatus === 'failed'
            ? 'Gönderilemedi, tekrar denenecek'
            : 'Senkronizasyon bekliyor'
        }`
      );
      lines.push(`   Açıklama: ${item.description}`);
      if (item.subSteps && item.subSteps.length > 0) {
        lines.push(`   Uygulanan Playbook Adımları (${item.subSteps.length}):`);
        item.subSteps.forEach((sub) => {
          lines.push(
            `     * Adım #${sub.order}: ${sub.title} (${sub.location}) - [${formatDateTimeTr(sub.completedAt)}]`
          );
        });
      }
      lines.push('--------------------------------------------------------------------');
    });

    lines.push('');
    lines.push(
      'Örnek veri / prototip — Bu rapor ARK-OS karar destek prototipi tarafından sentetik/yerel verilerle üretilmiştir; resmî kurum raporu yerine geçmez.'
    );

    triggerDownload(
      lines.join('\n'),
      `ark-os-olay-sonrasi-rapor-${selectedId.toLowerCase()}.txt`,
      'text/plain'
    );
  };

  const handleExportMd = () => {
    const nowStr = formatDateTimeTr(new Date().toISOString());
    const lines: string[] = [
      '# ARK-OS Olay Sonrası Raporu',
      '',
      `- **Site Adı:** ${siteName}`,
      `- **Rapor Tarihi / Saati:** ${nowStr}`,
      `- **Kapsam:** ${
        selectedId === 'ALL'
          ? `Tüm Olaylar (${totalCount} kayıt)`
          : `Tekil Olay (${selectedId})`
      }`,
      '',
      '## Özet Metrikler',
      '',
      '| Metrik | Değer |',
      '| :--- | :--- |',
      `| **Toplam Olay** | ${totalCount} |`,
      `| **Açık / Kapalı (Çözüldü)** | ${openCount} Açık / ${closedCount} Çözüldü |`,
      `| **Bekleyen Senkronizasyon** | ${pendingSyncCount} |`,
      `| **Açık Anomali / Eksik Veri** | ${activeAnomalyCount} |`,
      '',
      '## Olay Zaman Çizelgesi Tablosu',
      '',
      '| # | Tarih / Saat | Kod & Tür | Öncelik / Durum | Konum | Açıklama | Senkronizasyon |',
      '| :-: | :--- | :--- | :--- | :--- | :--- | :--- |',
    ];

    timelineItems.forEach((item, idx) => {
      const subText =
        item.subSteps && item.subSteps.length > 0
          ? ` (Alt adımlar: ${item.subSteps
              .map((s) => `#${s.order} ${s.title}`)
              .join('; ')})`
          : '';
      const safeDesc = `${item.description}${subText}`.replace(/\|/g, '\\|');
      const syncLabel =
        item.syncStatus === 'synced'
          ? 'Senkronize edildi'
          : item.syncStatus === 'failed'
          ? 'Gönderilemedi, tekrar denenecek'
          : 'Senkronizasyon bekliyor';

      lines.push(
        `| ${idx + 1} | ${formatDateTimeTr(item.createdAt)} | \`${item.id}\` - ${
          item.type
        } | ${item.priority} / ${item.status} | ${
          item.location
        } | ${safeDesc} | ${syncLabel} |`
      );
    });

    lines.push('');
    lines.push('---');
    lines.push(
      '> **Örnek veri / prototip:** Bu rapor ARK-OS karar destek prototipi tarafından sentetik/yerel verilerle üretilmiştir; resmî kurum raporu yerine geçmez.'
    );

    triggerDownload(
      lines.join('\n'),
      `ark-os-olay-sonrasi-rapor-${selectedId.toLowerCase()}.md`,
      'text/markdown'
    );
  };

  return (
    <section
      aria-label="Olay Sonrası Rapor"
      data-testid="after-action-report-section"
      className="print-only-report rounded-xl border border-slate-300 bg-white p-4 shadow-sm print:border-0 print:p-0 print:shadow-none"
    >
      {/* EKRAN KONTROLLERİ (Yazdırma çıktısında gizlenir: no-print / print:hidden) */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 print:hidden">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-950 sm:text-lg">
            <FileText className="h-5 w-5 text-slate-800" />
            Olay Sonrası Raporu ve Dışa Aktarma
          </h2>
          <p className="text-xs font-medium text-slate-700 sm:text-sm">
            Raporu Markdown (<code>.md</code>) veya düz metin (<code>.txt</code>)
            olarak indirebilir ya da yalnızca raporu 1-2 sayfa PDF/kağıt olarak
            yazdırabilirsiniz.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select
            aria-label="Raporlanacak Olay Seçimi"
            data-testid="report-incident-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full max-w-full truncate rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 sm:w-64"
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
            data-testid="export-md-report-btn"
            onClick={handleExportMd}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-extrabold text-indigo-950 hover:bg-indigo-100"
          >
            <FileCode className="h-3.5 w-3.5 text-indigo-700" />
            Markdown (.MD) İndir
          </button>

          <button
            type="button"
            data-testid="export-txt-report-btn"
            onClick={handleExportTxt}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-900 hover:bg-slate-100"
          >
            <Download className="h-3.5 w-3.5 text-slate-700" />
            Metin (.TXT) İndir
          </button>

          <button
            type="button"
            data-testid="print-report-btn"
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-slate-800"
          >
            <Printer className="h-3.5 w-3.5" />
            Yazdır / PDF Kaydet
          </button>
        </div>
      </div>

      {/* YAZDIRILABİLİR RAPOR GÖVDESİ */}
      <div
        data-testid="printable-report-body"
        className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 print:border-0 print:bg-white print:p-0"
      >
        {/* 1. RAPOR BAŞLIĞI, SİTE ADI VE TARİH/SAAT */}
        <div className="flex flex-wrap items-start justify-between gap-2 border-b-2 border-slate-900 pb-3">
          <div>
            <h3
              data-testid="report-main-title"
              className="text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl"
            >
              ARK-OS Olay Sonrası Raporu
            </h3>
            <p className="mt-0.5 text-xs font-bold text-slate-800 sm:text-sm">
              Site: <span className="font-extrabold">{siteName}</span>
            </p>
          </div>
          <div className="text-right text-xs font-semibold text-slate-800">
            <div>
              <strong>Tarih / Saat:</strong> {reportTimestamp}
            </div>
            <div className="mt-0.5">
              <strong>Kapsam:</strong>{' '}
              {selectedId === 'ALL'
                ? `Tüm Olaylar (${totalCount} Kayıt)`
                : `Tekil Olay (${selectedId})`}
            </div>
          </div>
        </div>

        {/* 2. ÖZET METRİKLER (4 KUTU) */}
        <div
          data-testid="report-summary-metrics"
          className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 print:grid-cols-4"
        >
          <div className="rounded-lg border border-slate-300 bg-white p-2.5">
            <div className="text-[11px] font-bold uppercase text-slate-600">
              Toplam Olay
            </div>
            <div className="mt-0.5 text-base font-extrabold text-slate-950">
              {totalCount} Kayıt
            </div>
          </div>

          <div className="rounded-lg border border-slate-300 bg-white p-2.5">
            <div className="text-[11px] font-bold uppercase text-slate-600">
              Açık / Kapalı
            </div>
            <div className="mt-0.5 text-base font-extrabold text-slate-950">
              {openCount} Açık / {closedCount} Çözüldü
            </div>
          </div>

          <div className="rounded-lg border border-slate-300 bg-white p-2.5">
            <div className="text-[11px] font-bold uppercase text-slate-600">
              Bekleyen Senkronizasyon
            </div>
            <div className="mt-0.5 text-base font-extrabold text-slate-950">
              {pendingSyncCount} Kayıt
            </div>
          </div>

          <div className="rounded-lg border border-slate-300 bg-white p-2.5">
            <div className="text-[11px] font-bold uppercase text-slate-600">
              Anomali Sayısı
            </div>
            <div className="mt-0.5 text-base font-extrabold text-slate-950">
              {activeAnomalyCount} Uyarı
            </div>
          </div>
        </div>

        {/* 3. OLAY ZAMAN ÇİZELGESİ TABLOSU */}
        <div className="overflow-x-auto">
          {timelineItems.length === 0 ? (
            <p className="py-3 text-center text-xs font-semibold text-slate-600">
              Raporlanacak olay kaydı bulunamadı.
            </p>
          ) : (
            <table
              data-testid="report-timeline-table"
              className="w-full border-collapse border border-slate-300 bg-white text-left text-xs"
            >
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 font-extrabold uppercase text-slate-900">
                  <th className="border-r border-slate-300 px-2 py-2">#</th>
                  <th className="border-r border-slate-300 px-2.5 py-2">
                    Tarih / Saat
                  </th>
                  <th className="border-r border-slate-300 px-2.5 py-2">
                    Kod & Tür
                  </th>
                  <th className="border-r border-slate-300 px-2.5 py-2">
                    Öncelik / Durum
                  </th>
                  <th className="border-r border-slate-300 px-2.5 py-2">
                    Konum
                  </th>
                  <th className="border-r border-slate-300 px-2.5 py-2">
                    Açıklama & Müdahale Adımları
                  </th>
                  <th className="px-2.5 py-2">Senkronizasyon</th>
                </tr>
              </thead>
              <tbody
                data-testid="report-timeline-list"
                className="divide-y divide-slate-300"
              >
                {timelineItems.map((item, idx) => (
                  <tr key={item.id} className="align-top">
                    <td className="border-r border-slate-300 px-2 py-2 font-bold text-slate-900">
                      {idx + 1}
                    </td>
                    <td className="whitespace-nowrap border-r border-slate-300 px-2.5 py-2 font-medium text-slate-800">
                      {formatDateTimeTr(item.createdAt)}
                    </td>
                    <td className="border-r border-slate-300 px-2.5 py-2">
                      <div className="font-mono text-[11px] font-bold text-slate-900">
                        {item.id}
                      </div>
                      <div className="font-semibold text-slate-800">
                        {item.type}
                      </div>
                    </td>
                    <td className="whitespace-nowrap border-r border-slate-300 px-2.5 py-2 font-bold text-slate-900">
                      <div>{item.priority}</div>
                      <div className="text-[11px] font-semibold text-slate-700">
                        Durum: {item.status}
                      </div>
                    </td>
                    <td className="border-r border-slate-300 px-2.5 py-2 font-semibold text-slate-800">
                      {item.location}
                    </td>
                    <td className="border-r border-slate-300 px-2.5 py-2 text-slate-900">
                      <div className="font-medium">{item.description}</div>
                      {item.subSteps && item.subSteps.length > 0 && (
                        <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-slate-700">
                          {item.subSteps.map((sub) => (
                            <li key={sub.stepId}>
                              <strong>Adım #{sub.order}:</strong> {sub.title} (
                              {sub.location}) — {formatDateTimeTr(sub.completedAt)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2 font-semibold text-slate-800">
                      {item.syncStatus === 'synced'
                        ? 'Senkronize edildi'
                        : item.syncStatus === 'failed'
                        ? 'Gönderilemedi'
                        : 'Bekliyor'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 4. EN ALTTA ZORUNLU "ÖRNEK VERİ / PROTOTİP" NOTU */}
        <div
          data-testid="report-footer-disclaimer"
          className="border-t border-slate-300 pt-2.5 text-xs font-bold text-slate-700"
        >
          Örnek veri / prototip — Bu rapor ARK-OS karar destek prototipi
          tarafından sentetik ve yerel verilerle üretilmiştir; resmî kurum raporu
          yerine geçmez.
        </div>
      </div>
    </section>
  );
}

export default AfterActionReportSection;
