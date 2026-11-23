# Rentwin araç GPS takip: yol haritası

Taslak, 23 Kasım 2026. Amaç: filodaki araçların konumunu, km'sini ve önemli olaylarını (kontak, hız, cihaz sökülmesi, ofise dönüş) Rentwin admin panelinden izlemek; bunları kontrat, km limiti ve bakım akışlarına bağlamak.

## 1. Rentwin'de bugün hazır olanlar

GPS verisi sıfırdan bir modül değil, var olan alanları besleyecek:

| Rentwin'deki alan / ekran | GPS ile ne kazanır |
|---|---|
| `Vehicle.currentKm` | Elle girilmek yerine cihazdan otomatik güncellenir |
| `Contract.pickUpKm` / `returnKm` | Teslim ve dönüşte cihaz km'si önerilir, yazım hatası azalır |
| `dailyKmLimit`, `monthlyKmLimit`, `kmOverageFee` | Kiralama sürerken limit aşımı erken görülür |
| `maintenanceIntervalKm`, `nextMaintenanceKm` | Bakım uyarısı gerçek km ile kendiliğinden tetiklenir |
| Araç durum panosu (`/admin/vehicles/status`) | Yanına "Filo haritası" eklenir |
| HGS kontrolü (`ContractHgsCheck`) | Güzergâh, geçiş itirazlarında kanıt olur |
| Rentwin Saha mobil uygulaması | Sonraki aşamada saha ekibine harita |

Filo: sitede 39 araç görünüyor (binek, panelvan, kamyonet; dizel, benzin, LPG, 1 elektrikli).

## 2. Temel teknik kısıt

Takip cihazları veriyi GSM hattı (GPRS/4G) üzerinden, sürekli açık bir TCP bağlantısıyla bir sunucuya yollar. Rentwin'in backend'i Vercel'de serverless çalışıyor ve bu tür kalıcı bağlantıları kabul edemez. Bu yüzden iki yol var: ya cihazları dinleyen küçük bir sunucu (VPS) kuracağız ya da bu işi hazır bir takip firmasına bırakıp onun API'sini kullanacağız.

GPS takip sistemi KABİS'ten tamamen bağımsızdır: kendi sunucusu olur, KABİS köprüsüyle (`kabis-proxy`) sunucu veya kod paylaşmaz.

## 3. Seçenekler

| | A. Hazır takip firması | B. Kendi altyapımız (önerilen) |
|---|---|---|
| Ne | Cihaz + hat + panel aylık abonelikle (Arvento, Mobiliz vb.) | Kendi aldığımız cihaz + M2M hat + açık kaynak Traccar sunucusu |
| Rentwin entegrasyonu | Firmanın API'si varsa ve izin veriyorsa | Tam kontrol, Traccar'ın REST API'si ve webhook'u ile |
| Aylık maliyet | Araç başı abonelik, filo büyüdükçe artar | Sadece M2M hat + VPS |
| Kurulum işi | Az, firma yapar | VPS ve Traccar kurulumu bizde (yazılımı ben yaparım) |
| Bağımlılık | Firmaya bağlı kalınır, veri onlarda | Cihazlar standart, istenirse başka sunucuya yönlendirilir |
| Destek | Firmanın çağrı merkezi | Sorun çıkarsa bizim çözmemiz gerekir |

**Karar (23 Kasım 2026): B, kendi altyapımız.** 39 araçta abonelik farkı yıllık olarak ciddi tutar. Ayrıca asıl hedef Rentwin içinde km, kontrat ve bakım otomasyonu; bunun için verinin tam kontrolü gerekiyor. Araçlarda zaten bir firmanın cihazı varsa (örneğin leasing şirketinin), o araçlar için o firmanın API verip vermediğine ayrıca bakılır.

## 4. Mimari (B seçeneği)

```
[Araç] Teltonika cihaz + M2M SIM
   │  4G/GPRS, TCP (Teltonika protokolü)
   ▼
[VPS] Traccar sunucusu ── kendi veritabanı (tam konum geçmişi burada)
   │  1) Olay webhook'u (kontak, hız, geofence, güç kesildi) ──► Rentwin /api/telematics/webhook
   │  2) REST API ◄── Rentwin backend (anlık konum, rota, km) sorar
   ▼
[Vercel] Rentwin backend (Express + Prisma) ── Neon: km, son görülme, olay türleri (koordinat yok)
   ▼
[Admin panel] Filo haritası · Araç "Konum" sekmesi · Kontrat rotası · Uyarılar
```

Tasarım kararları:
- **Konum verisi yalnızca Türkiye'deki VPS'te durur.** 39 araç her 30 saniyede bir konum yollarsa günde 100 binden fazla satır olur; bunu Neon'a yazmak hem maliyet hem gereksiz yük. Ayrıca Neon yurt dışında olduğu için Neon'a koordinat yazılmaz: yalnızca km, son görülme zamanı, kontak durumu ve olay türleri tutulur. Harita ve rota için koordinatlar her seferinde Traccar'dan çekilir.
- **Anlık harita "çekme" ile çalışır:** admin haritayı açtığında backend Traccar'dan son konumları ister (10–15 saniyede bir yenileme). Her konum noktası için Vercel fonksiyonu tetiklenmez, yalnızca olaylar webhook ile gelir.
- **Cihazlara IP değil alan adı yazılır** (ör. `gps.rentwin.com.tr`, Cloudflare'de "DNS only"). Sunucu değişirse cihazlara tek tek dokunmadan yalnızca DNS kaydı güncellenir.
- **Harita:** Leaflet + OpenStreetMap/CARTO karoları (ücretsiz, API anahtarı gerekmez). Google Maps yalnızca ihtiyaç olursa.
- **Güvenlik:** Traccar'ın yönetim paneli internete açık kalmaz, yalnızca Rentwin backend'i paylaşılan sırla erişir. Webhook da paylaşılan sırla doğrulanır. Anahtarlar repoya girmez.

## 5. Donanım önerisi

- **Cihaz:** Teltonika FMC serisi (4G LTE Cat-1, 2G yedekli; ör. FMC130 / FMC920 sınıfı). Traccar bu cihazları doğrudan destekler. 2G/3G şebekeleri zamanla kapandığı için yalnızca 2G'li ucuz cihazlardan kaçının.
- **Montaj:** OBD prizine takılan değil, oto elektrikçinin araç kablolamasına gizli bağladığı (hard-wired) model. Kiralık araçta OBD cihazını müşteri çekip çıkarabilir. Kontak hattı bağlanmalı ki kontak açık/kapalı ve sürüş süresi doğru gelsin.
- **Hat:** Operatörden kurumsal M2M/IoT hat. Cihaz başına aylık veri ihtiyacı küçük (onlarca MB).
- **Alım:** Türkiye distribütöründen, faturalı ve garantili. Yurt dışından tek tek getirilen cihazlarda kayıt ve garanti sorunu çıkabilir.
- **Yakıt seviyesi** (isteğe bağlı, sonraki faz): CAN okuyucu ek modül gerektirir, araç markasına göre değişir. İlk aşamada gerek yok.

## 6. Fazlar

### Faz 0: Kararlar ve hazırlık (yaklaşık 1 hafta)
- [x] A mı B mi kararı: B; araçlarda mevcut takip cihazı yok
- [ ] 3 cihaz + 3 M2M hat teklifi ve siparişi (sen)
- [ ] Natro XCloud TR "XCloud 2" siparişi (yalnızca GPS takip için), hesap ve ödeme sende; kurulumu ben yaparım
- [ ] Cihaz, hat ve montaj için teklif iste (hazır metinler: Ek B)
- [ ] KVKK: sözleşmenin 7.5 maddesini ve gizlilik politikasını güncelle (taslaklar: Ek A). Son kontrolü avukat/danışman yapar.

Bitti sayılır: pilot cihazlar elde, VPS açık, sözleşme maddesi onaylı.

### Faz 1: Pilot, 2–3 araç (1–2 hafta, cihaz teslimine bağlı)
- [ ] VPS'e Traccar + veritabanı kurulumu, güvenlik duvarı, otomatik yedek
- [ ] Cihazların montajı (oto elektrikçi) ve Traccar'a tanımlanması (IMEI)
- [ ] Birkaç gün veri toplama: konum doğruluğu, km tutarlılığı, kontak olayları, veri kullanımı

Bitti sayılır: pilot araçlar Traccar'da canlı görünüyor; cihaz km'si gösterge km'siyle tutarlı.

Cihazları beklemek gerekmez: VPS açılır açılmaz telefona kurulan ücretsiz "Traccar Client" uygulaması test cihazı gibi konum yollar. Faz 2'nin yazılımı bu sayede cihazlar gelmeden geliştirilip denenebilir.

### Faz 2: Rentwin entegrasyonu, ilk sürüm (1–2 hafta)
- [ ] Veritabanı (koordinatsız): `Vehicle.trackerImei`, `lastSeenAt`, `ignitionOn`; yeni `TelematicsEvent` tablosu (olay türü ve zamanı); konum görüntüleme erişim kaydı (`TelematicsAccessLog`)
- [ ] Backend `telematics` modülü: Traccar istemcisi, admin uç noktaları (anlık konumlar, araç rotası, olaylar), webhook
- [ ] Admin "Filo haritası": tüm araçlar; renkler kirada / müsait / serviste; son görülme, hız, kontak
- [ ] Araç detayında "Konum" sekmesi: son konum + tarih aralığına göre rota
- [ ] Kontrat detayında "Kiralama rotası": yalnızca kontrat süresi içindeki veri, yalnızca yetkili admin; her görüntüleme kayda geçer

Bitti sayılır: admin panelden pilot araçlar haritada canlı; kontrat rotası açılabiliyor.

### Faz 3: Operasyon otomasyonu ve tüm filo (2–3 hafta)
- [ ] Kalan araçlara montaj (araç başına yaklaşık 1 saat; günde birkaç araç)
- [ ] Km senkronu: `currentKm` otomatik; teslim ve dönüş formunda cihaz km'si önerisi
- [ ] Km limiti uyarısı: limitli kontratlarda kullanılan km, izin verilen km'nin %80'ine ulaşınca admin uyarısı
- [ ] Bakım uyarısı gerçek km ile (`nextMaintenanceKm` yaklaşınca)
- [ ] Bölge (geofence) uyarıları: Aliağa ofisi (araç geldi), isteğe bağlı il dışına çıkış
- [ ] Güvenlik uyarıları: cihazın gücü kesildi/söküldü, kontak kapalıyken hareket (çekici ile taşıma), aşırı hız (ör. 140 km/s üzeri)
- [ ] Gecikmiş iade: kontrat bitti ama araç ofiste değil
- [ ] Uyarı kanalı: admin paneli + e-posta (sonra Saha uygulamasına bildirim)

Bitti sayılır: tüm filo haritada; km ve bakım alanları elle girilmeden güncelleniyor; uyarılar geliyor.

### Faz 4: İleri özellikler (ihtiyaca göre)
- Rentwin Saha uygulamasında harita ve en yakın araç
- Yakıt seviyesi (CAN modülü) → `currentFuelEighths` otomatik
- Kaza/sert fren algılama (cihazın ivmeölçeri), sürüş puanı
- HGS itirazlarında güzergâh raporu
- Uzaktan motor durdurma: yalnızca araç dururken ve yazılı prosedürle. Hareket hâlinde motoru durdurmak can güvenliği riski taşır, bu yüzden en sona bırakıldı.

## 7. KVKK ve hukuki notlar

Kiradaki aracın konumu, aracı kullanan kişiyi belirlenebilir kıldığı için kişisel veridir (6698 sayılı KVKK).

Rentwin'de zemin büyük ölçüde hazır:
- Gizlilik politikası (`/privacy-policy`) GPS konum verisini işlenen veriler arasında sayıyor; hukuki sebep olarak meşru menfaati (md. 5/2-f, "araç güvenliği ve GPS ile konum takibi") gösteriyor.
- Kira sözleşmesinin 7.5 maddesi araçlara takip cihazı konabileceğini söylüyor.

Eksikler (taslaklar Ek A'da):
- 7.5 maddesi "KİRACI bu takibe onay vermiştir" diyor. Sözleşmenin içine gömülmüş bir onay, KVKK'daki açık rızanın şartlarını (özgür irade, belirli konu) karşılamayabilir. Zaten hukuki sebep meşru menfaat olduğu için madde onay yerine bilgilendirme olarak yazılmalı: hangi veri, hangi amaç, ne kadar süre, kim erişir.
- Gizlilik politikasında konum verisinin saklama süresi ve erişim kuralı yok.
- **Sunucunun yeri:** konum verisi yurt dışındaki bir VPS'te (ör. Hetzner Almanya/Finlandiya) tutulursa bu, KVKK md. 9 kapsamında yurt dışına aktarım sayılır ve ek prosedür gerektirir (standart sözleşme ve Kurul'a bildirim). Bu yüzden sunucu Türkiye'de olacak (bölüm 10) ve Neon'a koordinat yazılmayacak (bölüm 4). Harita açıldığında koordinatlar Vercel üzerinden geçerek ekrana gelir; bu geçişin ve Rentwin'in genel Vercel/Neon kullanımının KVKK açısından durumu avukata birlikte sorulmalı.

Kurallar:
- **Bilgilendirme:** kira sözleşmesinde ve aydınlatma metninde açıkça belirtilmeli: araçta takip cihazı olduğu, amacı (aracın güvenliği, km ve sözleşme takibi, çalınma/kaza), saklama süresi, kimlerin erişebildiği.
- **Amaçla sınırlılık:** canlı konum kiralama sırasında rutin olarak izlenmez. Erişim sebepleri tanımlı olmalı: gecikmiş iade, hırsızlık şüphesi, sözleşme ihlali, yol yardımı. Her erişim kayda geçer (Faz 2'deki erişim kaydı bunun için).
- **Saklama süresi:** ör. ham konum verisi 6 ay, sonra otomatik silinir (Traccar'da ayarlanır). Uyuşmazlık durumunda ilgili kontratın verisi ayrıca saklanabilir.
- **Kurumsal kiralamalar:** aracı kullanan çalışanlar kurumsal müşterinin personeli; kurumsal sözleşmeye de madde eklenmeli.
- VERBİS kaydı ve metinlerin son hâli için muhasebeci/avukat görüşü alınmalı. Ben metin taslağını hazırlarım, hukuki onay yerine geçmez.

## 8. Maliyet kalemleri (teklif alınacak)

| Kalem | Tür | Not |
|---|---|---|
| Takip cihazı | Tek sefer, araç başı | 4G Teltonika FMC sınıfı |
| Montaj | Tek sefer, araç başı | Oto elektrikçi, gizli kablolama |
| M2M hat | Aylık, araç başı | Operatör kurumsal teklifi |
| VPS | Aylık, tek | Natro XCloud 2, yalnızca GPS takip için |
| Yazılım | — | Traccar açık kaynak; Rentwin entegrasyonunu ben yaparım |

Karşılaştırma için en az bir hazır takip firmasından (A seçeneği) araç başı aylık fiyat da alınmalı.

## 9. Riskler

| Risk | Önlem |
|---|---|
| Cihazın sökülmesi/gücünün kesilmesi | Gizli montaj + "güç kesildi" uyarısı; cihazın dahili bataryası son konumu yollar |
| VPS çökerse veri kesilir | Cihazlar bağlantı yokken veriyi hafızada tutup sonra yollar; sunucu izleme + günlük yedek |
| Cihaz km'si ile gösterge km'si farkı | Pilotta karşılaştırılır; teslimde gösterge km'si esas kalır, cihaz km'si öneridir |
| Müşteri şikâyeti / KVKK | Açık bilgilendirme, tanımlı erişim sebepleri, erişim kaydı, saklama süresi |
| Hat/veri maliyetinin artması | Gönderim sıklığı ayarlanır (hareketteyken 30 sn, park hâlinde saatte 1) |

## 10. Alınan kararlar (23 Kasım 2026)

1. **Altyapı:** B, kendi altyapımız (Teltonika + M2M hat + Traccar).
2. **Mevcut cihaz:** filoda hiçbir araçta takip cihazı yok; tüm filoya yeni cihaz takılacak.
3. **Pilot araçlar:** Fiat Egea (binek), Ford Transit (kamyonet), Fiat Panda (elektrikli).
4. **Sunucu:** yalnızca GPS takip için, KABİS'ten bağımsız, Türkiye'de: **Natro XCloud TR, "XCloud 2" paketi** (2 vCPU, 4 GB RAM, 40 GB SSD, 504,43 TL/ay, Kasım 2026 fiyatı). İşletim sistemi Ubuntu 24.04 LTS. Satın almadan önce Natro'ya sorulacaklar: IP sabit mi, sunucu hangi şehirde, fiyata KDV dahil mi, snapshot var mı. Natro'nun "VPS Pro" ürünü Hollanda'da; o alınmamalı.
5. **Uyarı kanalı:** ilk sürümde admin paneli + e-posta.

Açık kalan: sözleşme 7.5 ve gizlilik politikası taslaklarının (Ek A) avukat onayı, saklama süresi ([6 ay] önerisi).

## Ek A: Sözleşme ve gizlilik politikası taslakları

Taslaktır, avukat/danışman onayından sonra Rentwin'e işlenir. Köşeli parantezdeki değerler karar gerektirir.

**Kira sözleşmesi, madde 7.5 (yeni metin):**

> 7.5. KİRALAYAN'a ait araçlarda araç takip (GPS) cihazı bulunur. Cihaz; aracın konumunu, hızını, kontak durumunu ve kilometresini kaydeder. Bu veriler aracın ve yol güvenliğinin sağlanması, çalınma veya kaza hâlinde müdahale, kilometre ve sözleşme hükümlerinin takibi ile olası uyuşmazlıkların çözümü amacıyla işlenir. Kiralama süresince konum verilerine yalnızca bu amaçlarla ve yetkili personel tarafından erişilir. Veriler kayıt tarihinden itibaren [6 ay] saklanır ve sonra silinir; bir uyuşmazlık veya resmî talep olması hâlinde ilgili kayıtlar süreç sonuçlanana kadar muhafaza edilir. KİRACI, aracı kullanacak diğer sürücüleri bu konuda bilgilendirir. KİRACI, cihazı sökemez, gücünü kesemez veya çalışmasını engelleyemez; aksi hâlde doğacak zarardan sorumludur. Kişisel verilerin işlenmesine ilişkin ayrıntılı bilgi rentwin.com.tr/privacy-policy adresindeki aydınlatma metnindedir.

**Gizlilik politikası, eklenecek paragraf (saklama ve erişim):**

> Kiralık araçlarda bulunan araç takip (GPS) cihazlarından elde edilen konum verileri, kayıt tarihinden itibaren [6 ay] saklanır ve bu sürenin sonunda otomatik olarak silinir. Bir uyuşmazlık veya resmî makam talebi olması hâlinde ilgili kayıtlar süreç sonuçlanana kadar muhafaza edilir. Kiralama süresince konum verilerine yalnızca araç güvenliği, gecikmiş iade, sözleşme ihlali şüphesi veya yol yardımı gibi gerekçelerle ve yetkili personel tarafından erişilir; her erişim kayıt altına alınır.

İngilizce karşılıkları, metin onaylandıktan sonra hazırlanır.

## Ek B: Teklif talebi metinleri

Kopyalayıp e-posta veya WhatsApp ile gönderilebilir.

**1. Cihaz (Teltonika Türkiye distribütörü veya bayisi):**

> Merhaba, araç kiralama filomuz için GPS takip cihazı almak istiyoruz. İlk etapta 3 adet (pilot), sonrasında yaklaşık 40 adet.
> İhtiyacımız: 4G LTE Cat-1 (2G yedekli), dahili yedek batarya, kontak girişi, ivmeölçer, araç kablolamasına sabit montaj. Teltonika FMC130, FMC920, FMC150 veya muadili olabilir.
> Kendi sunucumuzu kullanacağız; cihazların sunucu adresini kendimiz ayarlayabilmeliyiz (abonelik veya platform kilidi olmamalı).
> Rica ettiğimiz bilgiler: 3 ve 40 adet için birim fiyat (KDV hariç/dahil), garanti süresi, teslim süresi, faturalı satış. Varsa montaj hizmeti veya önerdiğiniz montajcı.

**2. M2M hat (Turkcell / Vodafone / Türk Telekom kurumsal):**

> Merhaba, araç takip cihazlarımız için kurumsal M2M/IoT hat almak istiyoruz. İlk etapta 3 adet, sonrasında yaklaşık 40 adet.
> Cihaz başına aylık tahmini veri kullanımı 50 MB, 4G; cihaz ayarları için SMS açık olmalı.
> Rica ettiğimiz bilgiler: hat başı aylık ücret, veri paketi seçenekleri, taahhüt süresi, hatları toplu yönetebileceğimiz bir panel olup olmadığı.

**3. Montaj (oto elektrikçi):**

> Merhaba, 3 aracımıza GPS takip cihazı taktırmak istiyoruz: [Fiat Egea, Ford Transit, Fiat Panda elektrikli]. Cihaz görünmeyecek bir yere gizli monte edilmeli; sabit +12V, şase ve kontak hattına bağlanmalı. Cihazları ve hatları biz getireceğiz.
> Araç başı ücret ve süre nedir? Sonrasında yaklaşık 40 araçlık filonun tamamı için de çalışmak isteriz.
