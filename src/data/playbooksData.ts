import { PlaybookDefinition } from '../types';

export const PLAYBOOK_DISCLAIMER =
  'Örnek taslak. Resmî kurum talimatlarının yerine geçmez.';

export const PLAYBOOKS: PlaybookDefinition[] = [
  {
    id: 'heatwave',
    title: 'Aşırı Sıcak Dalgası',
    subtitle: 'Trafo/soğutma yükü, su tüketimi ve hassas sakinlerin koordinasyonu',
    recommendedPriority: 'Yüksek',
    steps: [
      {
        stepId: 'hw-1',
        order: 1,
        title: 'Gündüz saatlerinde ortak bahçe sulamasını durdurun',
        detail:
          'Buharlaşma kaybını ve şebeke/depo düşüşünü önlemek için peyzaj sulamasını yalnızca gece saatlerine erteleyin.',
        defaultLocation: 'Ortak Bahçe / Otopark',
      },
      {
        stepId: 'hw-2',
        order: 2,
        title: 'Trafo, pano ve hidrofor odası havalandırmalarını kontrol edin',
        detail:
          'Aşırı ısınma kaynaklı şalter atmalarını önlemek için teknik odaların fan ve menfez açıklıklarını denetleyin.',
        defaultLocation: 'Jeneratör / Trafo Alanı',
      },
      {
        stepId: 'hw-3',
        order: 3,
        title: 'Yaşlı ve kronik rahatsızlığı olan sakinler için serin bekleme alanını hazırlayın',
        detail:
          'Sosyal tesis veya yönetim odasında klimalı/gölgeli alanı ve içme suyu stokunu hazır tutun.',
        defaultLocation: 'Site Giriş / Güvenlik Kulübesi',
      },
      {
        stepId: 'hw-4',
        order: 4,
        title: 'Pik saatlerde (13:00-17:00) ortak alan enerji yükünü azaltın',
        detail:
          'Zorunlu olmayan dekoratif aydınlatma ve ikincil pompaları geçici olarak devre dışı bırakın.',
        defaultLocation: 'Jeneratör / Trafo Alanı',
      },
    ],
  },
  {
    id: 'flash_flood',
    title: 'Ani Sağanak / Sel Riski',
    subtitle: 'Bodrum katlar, otopark girişleri, drenaj pompaları ve pano güvenliği',
    recommendedPriority: 'Kritik',
    steps: [
      {
        stepId: 'ff-1',
        order: 1,
        title: 'Yağmur suyu ızgaralarını ve otopark rampa kanallarını kontrol edin',
        detail:
          'Yaprak veya atık tıkanıklığı varsa temizleyerek suyun bodruma yönelmesini engelleyin.',
        defaultLocation: 'Ortak Bahçe / Otopark',
      },
      {
        stepId: 'ff-2',
        order: 2,
        title: 'Bodrum dalgıç pompalarının şamandıra ve enerji beslemesini doğrulayın',
        detail:
          'Drenaj kuyularındaki pompaların otomatik devreye girdiğini ve yedek güç bağlantısını kontrol edin.',
        defaultLocation: 'Merkez Su Deposu / Hidrofor',
      },
      {
        stepId: 'ff-3',
        order: 3,
        title: 'Kapalı otopark girişlerine su bariyeri / kum torbası yerleştirin',
        detail:
          'Kot farkı düşük olan blok ve otopark girişlerinde taşkın bariyerlerini hazır konuma getirin.',
        defaultLocation: 'Ortak Bahçe / Otopark',
      },
      {
        stepId: 'ff-4',
        order: 4,
        title: 'Asansörlerin bodrum kata inişini geçici olarak kısıtlama duyurusunu paylaşın',
        detail:
          'Asansör kuyularında su birikmesi ihtimaline karşı teknik görevli kontrolüyle zemin katta park ettirin.',
        defaultLocation: 'A Blok',
      },
    ],
  },
  {
    id: 'drought',
    title: 'Kuraklık ve Su Kesintisi',
    subtitle: 'Ana su deposu rezervi yönetimi, basınç kademesi ve tasarruf koordinasyonu',
    recommendedPriority: 'Yüksek',
    steps: [
      {
        stepId: 'dr-1',
        order: 1,
        title: 'Ortak alan yıkama, süs havuzu ve bahçe sulama vanalarını kapatın',
        detail:
          'Ana su deposundaki mevcut rezervi yalnızca konut içi temel kullanıma yönlendirin.',
        defaultLocation: 'Merkez Su Deposu / Hidrofor',
      },
      {
        stepId: 'dr-2',
        order: 2,
        title: 'Ana sayaç ile daire sayaçları toplamı arasındaki farkı kontrol edin',
        detail:
          'Depo çıkışı ile blok hatları arasında olağandışı fark varsa teknik ekiple saha kontrolü başlatın.',
        defaultLocation: 'Merkez Su Deposu / Hidrofor',
      },
      {
        stepId: 'dr-3',
        order: 3,
        title: 'Hidrofor çıkış basıncını ekonomik kademeye ayarlayın',
        detail:
          'Depo suyunun daha dengeli tüketilmesi için teknik personel eşliğinde basınç ayarını optimize edin.',
        defaultLocation: 'Merkez Su Deposu / Hidrofor',
      },
      {
        stepId: 'dr-4',
        order: 4,
        title: 'Blok panolarından ve yerel ağdan su kullanım bilgilendirmesi yayınlayın',
        detail:
          'Sakinlere güncel depo doluluk yüzdesini ve çamaşır/bulaşık makinesi kullanım önerilerini duyurun.',
        defaultLocation: 'Site Giriş / Güvenlik Kulübesi',
      },
    ],
  },
  {
    id: 'wildfire_smoke',
    title: 'Orman Yangını / Yoğun Duman',
    subtitle: 'Hava kalitesi koruma, taze hava fanları, çatı/bahçe kuru atık kontrolü',
    recommendedPriority: 'Kritik',
    steps: [
      {
        stepId: 'wf-1',
        order: 1,
        title: 'Ortak alan dış taze hava emiş fanlarını kapatıp iç sirkülasyona geçin',
        detail:
          'Dumanın blok merdiven boşluklarına ve sosyal alanlara dolmasını önlemek için menfezleri kapatın.',
        defaultLocation: 'A Blok',
      },
      {
        stepId: 'wf-2',
        order: 2,
        title: 'Çatı olukları ve bahçe sınırındaki kuru yaprak/yanıcı maddeleri uzaklaştırın',
        detail:
          'Uçuşan kıvılcımlara karşı bina çevresi ve çatı aralarındaki yanıcı materyalleri kontrol edin.',
        defaultLocation: 'Ortak Bahçe / Otopark',
      },
      {
        stepId: 'wf-3',
        order: 3,
        title: 'Yangın hidrantları ve yangın su deposu basınç değerlerini doğrulayın',
        detail:
          'Yangın pompa grubunun otomatik konumda ve vana geçişlerinin açık olduğunu teyit edin.',
        defaultLocation: 'Merkez Su Deposu / Hidrofor',
      },
      {
        stepId: 'wf-4',
        order: 4,
        title: 'Site içi araç çıkış koridorlarını ve acil araç giriş kapısını açık tutun',
        detail:
          'Resmî itfaiye ve sağlık ekiplerinin siteye engelsiz girişi için bariyerleri açık konuma alın.',
        defaultLocation: 'Site Giriş / Güvenlik Kulübesi',
      },
    ],
  },
  {
    id: 'long_power_outage',
    title: 'Uzun Süreli Elektrik Kesintisi',
    subtitle: 'Asansör kontrolü, jeneratör yakıt/yük yönetimi ve yerel ağ (UPS) sürekliliği',
    recommendedPriority: 'Kritik',
    steps: [
      {
        stepId: 'lp-1',
        order: 1,
        title: 'Tüm bloklarda asansör kabinlerini kontrol edin ve sesli teyit alın',
        detail:
          'Kesinti anında asansörde kalan sakin olup olmadığını blok görevlileriyle tek tek doğrulayın.',
        defaultLocation: 'B Blok',
      },
      {
        stepId: 'lp-2',
        order: 2,
        title: 'Yönetim odası yerel ağ (modem/panel) UPS batarya durumunu kontrol edin',
        detail:
          'ARK-OS yerel panelinin ve site içi Wi-Fi ağının açık kalması için gereksiz ekran/cihazları kapatın.',
        defaultLocation: 'Site Giriş / Güvenlik Kulübesi',
      },
      {
        stepId: 'lp-3',
        order: 3,
        title: 'Jeneratörü kritik yük moduna (acil aydınlatma + hidrofor) alın',
        detail:
          'Yakıt tüketimini dengelemek için yüksek güçlü ikincil yükleri devre dışı bırakıp yakıt seviyesini kaydedin.',
        defaultLocation: 'Jeneratör / Trafo Alanı',
      },
      {
        stepId: 'lp-4',
        order: 4,
        title: 'Tıbbi cihaz (oksijen konsantratörü vb.) kullanan dairelerle iletişime geçin',
        detail:
          'Kesintisiz enerjiye ihtiyaç duyan sakinlerin durumunu kontrol edip yedek güç noktasını paylaşın.',
        defaultLocation: 'A Blok',
      },
    ],
  },
];
