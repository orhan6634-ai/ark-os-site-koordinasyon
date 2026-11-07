import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onResetSimulatedCrash?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    // IndexedDB'deki bekleyen kayıtlara KESİNLİKLE dokunmaz; yalnızca hata ekranını açar.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ARK-OS ErrorBoundary yakaladı:', error, errorInfo);
  }

  handleReload = (): void => {
    if (this.props.onResetSimulatedCrash) {
      this.props.onResetSimulatedCrash();
    }
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          data-testid="error-boundary-fallback"
          className="flex min-h-screen items-center justify-center bg-slate-100 p-4 text-slate-950"
        >
          <div className="w-full max-w-lg rounded-2xl border-2 border-red-400 bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-red-100 p-3 text-red-700">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-950">
                  Beklenmedik Uygulama Hatası (Hata Kalkanı Aktif)
                </h1>
                <p
                  data-testid="error-boundary-message"
                  className="mt-2 text-sm font-bold leading-relaxed text-slate-800"
                >
                  Sistemde beklenmedik bir hata oluştu. Kayıtlarınız cihazda
                  korunuyor. Lütfen sayfayı yenileyin.
                </p>
                <p className="mt-2 text-xs font-medium text-slate-600">
                  Yerel veritabanındaki (IndexedDB) çevrimdışı ve senkronizasyon
                  bekleyen kayıtlarınıza hiçbir şekilde dokunulmamıştır.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                data-testid="error-boundary-reload-btn"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800 sm:text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Sayfayı Yenile
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
