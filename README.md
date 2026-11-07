# ARK-OS — Site İçi Karar Destek ve Kesinti Koordinasyon Prototipi (MVP)

**ARK-OS**, apartman/site yönetimlerinin günlük su, elektrik ve bakım göstergelerini takip etmesini; internet veya şebeke kesintisi gibi kriz anlarında ise **yerel (çevrimdışı) modda** olay/ihtiyaç kaydı tutarak bağlantı geldiğinde verileri otomatik senkronize etmesini sağlayan bir web uygulaması (PWA) prototipidir.

---

## ⚠️ Önemli Dürüstlük ve Kapsam Sınırı Bildirimi

1. **Karar Destek Aracıdır:** Bu yazılım bir karar destek ve koordinasyon prototipidir. **Yapısal güvenlik analizi (deprem/bina dayanımı), tahliye emri veya arama-kurtarma sistemi DEĞİLDİR.**
2. **Sentetik (Örnek) Veri:** Sisteme gerçek sayaç veya sensör bağlı değildir. Ekrandaki tüm su, elektrik ve bakım verileri **sentetik örnek veridir** ve ekranda açıkça `"Örnek veri"` olarak etiketlenmiştir.
3. **Su Anomalisi:** Ana sayaç ile daire sayaçları toplamı arasındaki fark yüksek olduğunda sistem kesin `"kaçak"` iddiasında bulunmaz; yalnızca **"İnceleme gerektiren anomali"** uyarısı üretir.
4. **Kriz Oyun Planları (Playbook):** Uygulamadaki 5 kriz kontrol listesi **"Örnek taslaktır; resmî kurum talimatlarının (AFAD, İtfaiye, 112 vb.) yerine geçmez."**
5. **Elektrik Kesintisi Simülasyonu:** Demo panelindeki `"Elektriği kes"` butonu gerçek bir elektrik kesintisi yaratmaz; yalnızca uygulamanın simülasyon durumunu değiştirir. **Gerçek bir elektrik kesintisinde bu sistemin çalışabilmesi için kullanılan bilgisayar/tabletin ve yerel ağın (modem/router) kesintisiz güç kaynağına (UPS / yedek batarya) bağlı olması şarttır.**

---

## 🛠️ 1. Kurulum (İlk Kez Çalıştırırken)

Bilgisayarınızda **Node.js** kurulu olmalıdır. Aşağıdaki komutları **PowerShell** veya **Komut İstemi (CMD)** ekranına kopyalayıp yapıştırarak çalıştırabilirsiniz:

```powershell
cd "C:\Users\orhan şahin\Desktop\Projelerim\site denetleme sistemi"
npm install
```

---

## 🚀 2. Sistemi Çalıştırma (2 Adımda Başlatma)

Tam senkronizasyon özelliğini görmek için **1) Yerel Sahte Sunucuyu** ve **2) Web Arayüzünü** çalıştırın.

### Adım 2.1 — Yerel Sahte Sunucuyu Başlatın (1. Terminal Penceresi)
PowerShell penceresini açıp şu komutu yapıştırın ve Enter'a basın:

```powershell
cd "C:\Users\orhan şahin\Desktop\Projelerim\site denetleme sistemi"
npm run server
```
> Ekranda `[ARK-OS Mock Server] Çalışıyor: http://127.0.0.1:3001` yazısını göreceksiniz. Bu pencereyi açık bırakın.

### Adım 2.2 — Web Uygulamasını Başlatın (2. Terminal Penceresi)
Yeni bir PowerShell penceresi açıp şu komutu yapıştırın ve Enter'a basın:

```powershell
cd "C:\Users\orhan şahin\Desktop\Projelerim\site denetleme sistemi"
npm run dev
```
> Ardından internet tarayıcınızda (Edge veya Chrome) şu adresi açın:
> **http://localhost:5173/**

### Adım 2.3 — Üretim Sürümü (Build + Preview) ve Gerçek Çevrimdışı (Offline) Testi
Service Worker ve PWA uygulama kabuğunun gerçek çevrimdışı ortamda (ağ tamamen kesikken sayfa yenilendiğinde) çalışmasını test etmek için üretim sürümünü şu komutla başlatın:

```powershell
cd "C:\Users\orhan şahin\Desktop\Projelerim\site denetleme sistemi"
npm run build
npm run preview
```
> Üretim önizleme sunucusu **http://localhost:4173/** adresinde açılır.
>
> **Gerçek offline testi:** build'i çalıştır, tarayıcı geliştirici araçlarında Network > Offline seç, sayfayı yenile, kayıt ekle, Offline'ı kapat, kaydın senkronize olduğunu gör.

---

## 🎬 3. Adım Adım Demo Senaryosu (Sunumda Nasıl Gösterilir?)

Tarayıcınızda **http://localhost:5173/** adresini açtıktan sonra aşağıdaki adımları sırayla uygulayarak tüm özellikleri sergileyebilirsiniz:

### Adım 1: Gizli Demo Kontrol Panelini Açın
- Demo Kontrol Paneli güvenlik gereği üretimde varsayılan olarak **kapalıdır**.
- Açmak için sayfanın **en altına** inip sağ alttaki mor renkli **"Gizli Demo Kontrol Panelini Aç (Sunum İçin)"** butonuna tıklayın (veya doğrudan **http://localhost:5173/?demo=1** adresine gidin).

### Adım 2: Veri Kaynağı Kopmasını ve Su Anomalisini Gösterin
1. Demo panelinde **"3. Bir Veri Kaynağını Kapat"** butonuna tıklayın:
   - Elektrik bölümündeki *GES (Güneş) Üretimi* kartının uydurma sayı göstermek yerine kırmızı **"Veri yok / Veri Yok (Okunamadı)"** rozetine geçtiğini gösterin.
2. Demo panelinde **"4. Su Farkı Üret"** butonuna tıklayın:
   - Su Yönetimi bölümünde Ana Sayaç ile Daire Sayaçları toplamı arasındaki farkın `%15` eşiğini aştığını ve sistemin kesin kaçak iddiası yapmadan **"İnceleme Gerektiren Su Tüketim Anomalisi"** uyarısı verdiğini gösterin.

### Adım 3: İnterneti ve Elektriği Kesin (Çevrimdışı Kriz Modu)
1. Demo panelinde **"1. İnterneti Kes"** butonuna tıklayın:
   - Üst çubuktaki bağlantı durumunun **"Çevrimdışı (Yerel Mod)"** olarak değiştiğini gösterin.
2. Demo panelinde **"2. Elektriği Kes"** butonuna tıklayın:
   - Sistemin otomatik olarak kırmızı **"2. Kriz / Kesinti Modu"**na geçtiğini, en üstte Su Deposu, Yedek Batarya ve Jeneratör kartlarının öne çıktığını ve *"Elektrik Kesintisi"* oyun planının (Playbook) açıldığını gösterin.
   - Demo panelindeki sarı **Elektrik Kesintisi Dürüstlük Bildirimi** kutusuna dikkat çekin.

### Adım 4: Çevrimdışıyken Oyun Planı Adımı İşaretleyin ve Olay Kaydedin
1. **Kriz Oyun Planları (Playbook)** kutusunda herhangi bir kontrol adımının yanındaki kutucuğu işaretleyin:
   - Bu adımın saatiyle birlikte otomatik olarak **Olay ve İhtiyaç Kaydı** listesine eklendiğini gösterin.
2. **Yeni Olay / İhtiyaç Ekle** formundan yeni bir kayıt girin (ör. Konum: `B Blok Daire 8`, Açıklama: `Yedek su bidonu talebi`) ve **Kaydet**'e basın:
   - Kaydın internet olmadan tarayıcının yerel veritabanına (`IndexedDB`) kaydedildiğini ve yanında sarı **"Senkron Bekliyor"** rozeti bulunduğunu gösterin.
   - İsterseniz sayfayı yenileyin (`F5`): Kayıtların kaybolmadığını kanıtlayın.

### Adım 5: İnterneti Geri Açın ve Tekilleştirmeli (Çift Kayıt Önlemeli) Senkronizasyonu Gösterin
1. Demo panelinde **"1. İnterneti Geri Aç (Simülasyon)"** butonuna tıklayın:
   - Üst çubuğun **"Senkronize ediliyor"** → **"Çevrimiçi • Senkronize edildi"** durumuna geçtiğini ve kaydın rozetinin yeşil **"Senkronize Edildi"** olduğunu gösterin.
2. Olay listesinin üstündeki **"Şimdi Senkronize Et"** butonuna tekrar tıklayın:
   - Yeşil bilgi kutusunda `Yeni eklenen: 0, Çift kayıt önlenen (atlanan): ...` bilgisini göstererek aynı kaydın sunucuda iki kez oluşturulmadığını kanıtlayın.

### Adım 6: Olay Sonrası Raporu İnceleyin ve Dışa Aktarın
1. Sayfanın alt kısmındaki **"Olay Sonrası Rapor (Zaman Çizelgesi)"** bölümüne inin.
2. Açılır menüden ister **"Tüm Olay ve Müdahale Kayıtları"**nı, ister tek bir olayı seçin.
3. **"Metin (.txt) İndir"** veya **"Yazdır / PDF Kaydet"** butonuna tıklayarak kronolojik raporu dışa aktarın.

---

## 📁 Proje Klasör Yapısı

- `src/App.tsx`: Ana uygulama, 3 çalışma modu (`Normal`, `Kriz / Kesinti`, `İyileşme`) ve durum yönetimi
- `src/data/syntheticData.ts`: Sentetik su, elektrik ve bakım verileri
- `src/data/playbooksData.ts`: 5 kriz senaryosu için örnek oyun planları
- `src/db/localDb.ts`: Tarayıcı içi yerel veritabanı (`Dexie` / `IndexedDB`)
- `src/services/syncService.ts`: Yerel sahte sunucu ile otomatik/elle senkronizasyon servisi
- `src/components/IncidentSection.tsx`: Olay ve İhtiyaç Kaydı formu, doğrulama ve durum güncelleme
- `src/components/WaterAnomalyBanner.tsx`: Su sayaç farkı anomali uyarı bileşeni
- `src/components/PlaybookSection.tsx`: Kriz Oyun Planları (Playbook) ve otomatik kayıt oluşturma
- `src/components/DemoControlPanel.tsx`: Gizli Demo Kontrol Paneli ve dürüstlük bildirimi
- `src/components/AfterActionReportSection.tsx`: Yazdırılabilir ve indirilebilir Olay Sonrası Rapor
- `server/mockServer.mjs`: `http://127.0.0.1:3001` üzerinde çalışan yerel sahte sunucu (`server/db.json` dosyasına kaydeder)
- `public/sw.js` & `public/manifest.webmanifest`: Çevrimdışı önbellekleme (Service Worker) ve PWA yapılandırması
