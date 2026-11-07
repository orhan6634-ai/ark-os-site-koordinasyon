# ARK-OS Site Koordinasyon Paneli — MVP v0.9 (Proof of Concept)

> **Sürüm Bilgisi:** `ARK-OS MVP v0.9 (prototip / Proof of Concept). Örnek verilerle çalışır, gerçek sensör entegrasyonu yoktur. Ticari kullanım ve entegrasyon için geliştirilmektedir.`

---

## 1. Proje Hakkında

**ARK-OS Site Koordinasyon Paneli**, çok bloklu konut sitelerinin ve tesis yönetimlerinin günlük su tüketimi, elektrik/yedek güç durumu ve teknik bakım işlerini tek ekrandan izlemesini; internet veya şebeke kesintisi gibi kriz durumlarında ise **Offline-First (Önce Çevrimdışı)** mimarisi sayesinde internet bağlantısı olmadan da yerel veritabanında (`IndexedDB`) olay/ihtiyaç kaydı ve müdahale adımı (Playbook) tutmasını sağlayan bir **İlerici Web Uygulaması (PWA)** prototipidir.

Uygulama dört ana sekmeden oluşur:
- **Gösterge Paneli:** İlk bakışta 4 kartlık **Genel Durum Özeti** (Bağlantı durumu, Çalışma modu `[NORMAL]` / `[KRİZ]` / `[İYİLEŞME]`, Bekleyen senkronizasyon sayısı, Açık anomali/eksik veri sayısı), Su Yönetimi (m³ ve % fark, ayarlanabilir örnek eşikler, 24 saatlik sentetik fark grafiği) ve Elektrik & Yedek Güç Yönetimi (örnek hesaplamalı tahmini yedek güç çalışma süresi ve Kriz Modunda insan onaylı Yük Azaltma simülasyonu).
- **Kriz ve Playbook:** 5 örnek kriz senaryosu (Elektrik Kesintisi, Su Kesintisi, Deprem Sonrası İlk Kontrol, Su Baskını, Jeneratör Arızası) için kontrol listeleri. Bir oyun planındaki adımlar işaretlendiğinde olay günlüğünü kirletmez; **tek bir olay kaydı** altında saat damgalı açılır/kapanır alt adımlar olarak saklanır.
- **Olay Kayıtları ve Rapor:** 6 hazır hızlı etiket (`+ Boru patlağı`, `+ Pompa arızası`, `+ Elektrik kesintisi`, `+ Su baskını`, `+ Jeneratör sorunu`, `+ Yardım talebi`), canlı karakter sayacı, 4'lü filtreleme (Tür, Öncelik, Durum, Senkronizasyon), sayfalama (`Daha Fazla Göster`) ve yalnızca raporu 1-2 sayfa olarak çıkaran **Olay Sonrası Raporu** (`.md`, `.txt` ve `Yazdır / PDF Kaydet`).
- **Teknik Bakım:** Çalışma moduna göre önceliklendirilen periyodik bakım ve arıza kontrol tablosu.

---

## 2. Kullanılan Teknolojiler

- **Önyüz (Frontend):** React 18, TypeScript, Tailwind CSS, Lucide React ikon seti
- **Yapılandırma ve Derleme:** Vite 6 (`npm run build`, `npm run preview`)
- **Yerel Veritabanı (Offline Depolama):** `Dexie.js` (`IndexedDB` sarmalayıcısı — `ark_os_local_db`)
- **Çevrimdışı Uygulama Kabuğu (PWA):** Özel Service Worker (`public/sw.js` — Network-First + Cache Fallback stratejisi), `public/manifest.webmanifest`, yerel SVG uygulama ikonları (`icon-192.svg`, `icon-512.svg`)
- **Senkronizasyon Sunucu Katmanı (3 Katmanlı Hibrit):**
  1. Yerel geliştirme için Node.js + Express (`server/mockServer.mjs`, port `3001`, `server/db.json` kalıcılığı)
  2. Bulut dağıtımı için Vercel Serverless Functions (`api/sync.mjs`, `api/health.mjs`, `vercel.json`)
  3. Sunucusuz statik barındırma için tarayıcı içi simüle sunucu yedek katmanı (`localStorage` tabanlı `ark_os_simulated_server_db_v1`)

---

## 3. Kurulum

Bilgisayarınızda **Node.js (v18 veya üzeri)** kurulu olmalıdır.

### 3.1 Bağımlılıkların Yüklenmesi
```powershell
git clone https://github.com/orhan6634-ai/ark-os-site-koordinasyon.git
cd ark-os-site-koordinasyon
npm install
```

### 3.2 Geliştirme Ortamını Başlatma (Yerel Express Sunucusu + Vite Dev)
1. **Terminal 1 (Yerel Senkronizasyon Sunucusu — Port 3001):**
   ```powershell
   npm run server
   ```
2. **Terminal 2 (Web Arayüzü — Port 5173):**
   ```powershell
   npm run dev
   ```
   Tarayıcıda `http://localhost:5173/` adresini açın.

### 3.3 Üretim Sürümü (Production Build) ve Gerçek Çevrimdışı Test Ortamı
Service Worker ve PWA önbelleklemesinin gerçek ağ kesintisinde (`Network > Offline`) tam olarak çalışması için üretim derlemesini başlatın:
```powershell
npm run build
npm run preview
```
Üretim önizleme sunucusu **`http://localhost:4173/`** adresinde çalışır.

---

## 4. Mimari Yapı (Offline-First Nasıl Çalışıyor, Hangi Kısımlar Gerçek, Hangileri Simülasyon?)

### 4.1 Offline-First ve Senkronizasyon Mimarisi
1. **Uygulama Kabuğunun Önbelleklenmesi (`public/sw.js`):** Uygulama ilk kez açıldığında Service Worker `index.html`, derlenmiş JS/CSS paketleri, `manifest.webmanifest` ve SVG ikonlarını `ark-os-shell-v4` önbelleğine kaydeder. Ağ varken **Network-First** (güncel dosyayı getirip önbelleği yenileme), ağ kesildiğinde ise **Cache Fallback** (önbellekten anında açılma) uygulanır.
2. **Yerel Veritabanı (`src/db/localDb.ts`):** Kullanıcı olay eklediğinde, durum güncellediğinde veya Playbook adımı işaretlediğinde veri önce cihazdaki `IndexedDB` (`incidents` ve `playbookSteps` tabloları) içine `syncStatus: 'pending'` olarak yazılır.
3. **Gerçek Ağ vs Demo Simülasyonu Ayrımı:**
   - Tarayıcı gerçekten çevrimdışı olduğunda (`navigator.onLine === false` veya DevTools `Offline`), üst barda **`Çevrimdışı (Gerçek Ağ Kesintisi)`** rozeti gösterilir.
   - Sağ alttaki Demo çekmecesinden kesinti tetiklendiğinde ise **`Çevrimdışı (Demo Simülasyonu)`** rozeti gösterilir.
4. **Tekilleştirmeli (Idempotent) 3 Katmanlı Senkronizasyon (`src/services/syncService.ts`):**
   - Eşzamanlı çağrıları engelleyen `syncInFlightPromise` kilidi sayesinde internet geri geldiğinde ve aynı anda **"Şimdi Senkronize Et"** düğmesine basıldığında çift kayıt oluşmaz.
   - Kayıtlar benzersiz `id` (`OLAY-...` veya `OLAY-PB-...`) ile gönderilir; sunucu aynı `id` varsa yeni satır açmak yerine mevcut kaydı günceller veya mükerrer olarak atlar.
   - Senkronizasyon servisi sırasıyla: **(1)** Yerel Express sunucusunu (`127.0.0.1:3001`), **(2)** Bulut Serverless uç noktasını (`/api/sync`), **(3)** Statik barındırma yedek katmanını dener.

### 4.2 Gerçek Olan Kısımlar vs Simülasyon Olan Kısımlar

| Bileşen / Özellik | Durum | Açıklama |
| :--- | :--- | :--- |
| **PWA & Service Worker Önbelleği** | **Gerçek** | Ağ tamamen kapatılıp (`Network > Offline`) sayfa yenilendiğinde uygulama gerçek önbellekten açılır. |
| **IndexedDB (`Dexie`) Kayıt & Sorgu** | **Gerçek** | Tüm olaylar, filtreler ve Playbook alt adımları tarayıcı veritabanında kalıcı olarak saklanır. |
| **Tekilleştirmeli Senkronizasyon** | **Gerçek** | `pending` / `synced` / `failed` durum geçişleri ve `id` bazlı çift kayıt önleme gerçektir. |
| **Yazdırma (`@media print`) & `.md`/`.txt` İndirme** | **Gerçek** | Yalnızca raporu çıkaran A4 yazdırma kuralları ve dosya indirme işlevleri gerçektir. |
| **Hata Kalkanı (`ErrorBoundary`) & XSS Koruması** | **Gerçek** | Render hatalarında `IndexedDB` verilerini korur; kullanıcı metinleri düz metin olarak kaçırılır. |
| **Su ve Elektrik Sayaç Değerleri** | **Simülasyon (Örnek Veri)** | Fiziksel IoT/SCADA sensörü bağlı değildir; değerler `src/data/syntheticData.ts` üzerinden üretilir. |
| **24 Saatlik Su Farkı Mini Grafiği** | **Simülasyon (Örnek Veri)** | Sentetik 24 saatlik örnek tüketim farkı dizisini görselleştirir. |
| **Yedek Güç Tahmini Çalışma Süresi** | **Simülasyon (Örnek Hesap)** | Örnek yakıt (`250 L`), batarya (`%72`) ve yük (`~42 kW`) parametreleriyle yapılan örnek hesaptır. |
| **Kritik Olmayan Yük Azaltma Onayı** | **Simülasyon (Karar Kaydı)** | Gerçek pano/şalter kesmez; yalnızca yetkili rolün onay/red kararını olay günlüğüne kaydeder. |

---

## 5. Demo ve Test Senaryosu (Gerçek Offline Testi Dâhil)

### 5.1 Gerçek Çevrimdışı (Offline) Testi (Adım Adım)
1. Üretim sunucusunu (`npm run build && npm run preview` ile `http://localhost:4173/`) veya canlı HTTPS adresini açın.
2. Tarayıcıda `F12` ile Geliştirici Araçlarını (DevTools) açıp **Ağ (Network)** sekmesine gelin ve kısıtlama menüsünden **Çevrimdışı (Offline)** seçeneğini işaretleyin.
3. Üst çubukta **`Çevrimdışı (Gerçek Ağ Kesintisi)`** rozetinin belirdiğini görün.
4. Ağ hâlâ **Çevrimdışı** iken sayfayı yenileyin (`F5` veya `Ctrl + R`): Uygulamanın hata vermeden Service Worker önbelleğinden tam ekran açıldığını doğrulayın.
5. Sol menüden **"Olay Kayıtları ve Rapor"** sekmesine geçin, **`+ Boru patlağı`** hızlı etiketine tıklayıp **"Kaydı Yerel Veritabanına Ekle"** düğmesine basın.
6. Kaydın tabloya **`Senkronizasyon bekliyor`** rozetiyle eklendiğini görün.
7. DevTools **Ağ (Network)** sekmesinde **Çevrimdışı (Offline)** modunu kapatıp **Kısıtlama yok (No throttling)** seçin.
8. Kaydın otomatik olarak senkronize edildiğini, rozetinin **`Senkronize edildi`** olarak güncellendiğini ve **"Şimdi Senkronize Et"** düğmesine tekrar basıldığında çift kayıt oluşmadığını doğrulayın.

### 5.2 Sunum / Demo Çekmecesi Senaryosu
1. Sağ alt köşedeki mor **"Demo"** düğmesine tıklayarak **Demo Kontrol Çekmecesini** açın.
2. **"4. Su Farkı Üret"** düğmesine tıklayıp **Gösterge Paneli**nde hem `m³` hem `%` farkın örnek eşiği aştığını ve 24 saatlik sentetik fark grafiğinin kırmızıya döndüğünü gösterin.
3. **"2. Elektriği Kes (Simülasyon)"** düğmesine tıklayıp sistemin **`[KRİZ] 2. Kriz / Kesinti Modu`**na geçtiğini, **Yedek Güç Tahmini Çalışma Süresi** ve **Kritik Olmayan Yük Azaltma Önerisi (İnsan Onaylı)** kartlarının aktifleştiğini gösterin.
4. **Kriz ve Playbook** sekmesinde adımları işaretleyip **Olay Kayıtları ve Rapor** sekmesinde bunların **tek bir olay kaydı** altında açılır/kapanır alt adımlar olarak toplandığını gösterin.
5. **"7. Hata Kalkanı (Error Boundary) Testi"** düğmesine basarak arayüz çöktüğünde dahi bekleyen kayıtların silinmediğini gösterin.

---

## 6. Dağıtım (Deployment)

Proje hem **Vercel** (veya Netlify/Cloudflare Pages) üzerinde bulut dağıtımına hem de statik barındırmaya hazırdır.

### 6.1 Kalıcı Canlı HTTPS Adresi (7/24 Açık Bulut Dağıtımı — Netlify)
- **Kalıcı Canlı Site URL:** `https://ark-os-site-koordinasyon.netlify.app/`
- **Bulut API Sağlık Uç Noktası:** `https://ark-os-site-koordinasyon.netlify.app/api/health`
- **Bulut Senkronizasyon Uç Noktası:** `https://ark-os-site-koordinasyon.netlify.app/api/sync`

### 6.2 Vercel ile Dağıtım (GitHub Bağlama veya CLI)
Projede `vercel.json`, `api/sync.mjs` ve `api/health.mjs` dosyaları hazır olarak yer alır:
1. Projeyi GitHub deponuza gönderin (`git push`).
2. [Vercel Dashboard](https://vercel.com/new) üzerinden depoyu içe aktarın (Framework Preset: `Vite`, Build Command: `npm run build`, Output Directory: `dist`).
3. **Deploy** düğmesine basın; hem statik PWA kabuğu hem de `/api/sync` ve `/api/health` uç noktaları otomatik olarak HTTPS üzerinde yayına alınır.

### 6.3 Doğrudan `dist` Klasörünü Statik Barındırmaya Yükleme
1. `npm run build` komutunu çalıştırın.
2. Oluşan `dist/` klasörünü herhangi bir HTTPS destekli statik sunucuya (Netlify Drop, Cloudflare Pages, GitHub Pages, Nginx) yükleyin.
3. Harici bir backend bulunmasa bile `src/services/syncService.ts` içindeki 3. katman (tarayıcı içi simüle sunucu katmanı) devreye girerek senkronizasyon akışını kesintisiz çalıştırır.

---

## 7. Gizlilik ve Dürüstlük İlkeleri

1. **Karar Destek Sınırı:** ARK-OS bir karar destek ve koordinasyon prototipidir. **Yapısal bina/deprem güvenlik analizi yapmaz, tahliye emri vermez ve yapay zekâ ile otomatik şalter/vana kapatmaz.**
2. **Sentetik Veri Şeffaflığı:** Tüm su, elektrik, batarya ve jeneratör göstergeleri sentetik örnek veridir ve arayüzde açıkça `"Örnek veri"` / `"Simülasyon, gerçek ölçüm değildir"` olarak etiketlenmiştir.
3. **Anomali İfadesi:** Ana sayaç ile daire sayaçları arasındaki fark eşiği aştığında sistem kesin `"su kaçağı var"` iddiasında bulunmaz; yalnızca **"İnceleme gerektiren anomali"** uyarısı üretir.
4. **Resmî Kurum Uyarısı:** Kriz oyun planları (Playbook) altında açıkça `"Örnek taslak. Resmî kurum talimatlarının yerine geçmez."` notu yer alır.
5. **Kişisel Veri ve KVKK Uyarısı:** Bu prototip ortamında gerçek apartman sakinlerine ait kişisel verilerin girilmemesi için olay kayıt formunda açıkça **"Bu prototipte gerçek kişisel veri girmeyin."** uyarısı bulunur.
6. **Donanım ve Kesintisiz Güç (UPS) Gerçekliği:** Gerçek bir elektrik kesintisinde yerel panelin ve yerel ağın çalışmaya devam edebilmesi için kullanılan bilgisayar/tabletin ve modem/router cihazlarının fiziksel bir **Kesintisiz Güç Kaynağına (UPS / yedek batarya)** bağlı olması gerekir.
