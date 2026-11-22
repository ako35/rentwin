# Google sıralaması: teşhis ve plan

Rentwin'in "Aliağa araç kiralama" ve benzeri aramalardaki yeri sık sık değişiyor; bazen ilk sayfada, bazen geride. Bu dosya 15 Kasım 2026'daki ölçümü, nedenleri ve yapılacakları tutar.

## 1. Bugünkü durum (15 Kasım 2026)

**Search Console, son 3 ay (12 Eylül – 13 Kasım):** 62 tıklama, 345 gösterim, ortalama konum 12,5.

| Sorgu | Tıklama | Gösterim | Ort. konum |
|---|---|---|---|
| rentwin | 27 | 46 | 1,4 |
| aliağa araç kiralama | 7 | 43 | 6,9 |
| aliaga rent a car | 0 | 5 | 8,4 |
| aliağa rent a car | 0 | 4 | 45,5 |
| aliağa araç kiralama fiyatları | 0 | 3 | 20,3 |
| izmir havalimanı araç kiralama | 0 | 6 | 80,8 |

"Aliağa" geçen aramalarda günlük konum 7 ile 60 arasında gidip geliyor ve günde ancak birkaç gösterim var. Hacim bu kadar düşükken birkaç arama bile ortalamayı oynatıyor; dalgalanmanın bir kısmı bundan.

**Canlı Google sonuçları (15 Kasım, Aliağa'dan):**

- "aliağa araç kiralama" ve "aliağa rent a car" aramalarında rentwin.com.tr ilk 20 organik sonuçta yok. Üstte sahibinden, enuygun, turna, yolcu360 gibi platformlar ve aliagarentacar.com, aliagaarackiralama.com gibi adında "Aliağa" geçen yerel siteler var.
- Haritalar'da "aliağa araç kiralama": Rentwin reklamsız sonuçlarda **8. sırada**. İlk üç: Aliağa Ensar Rent A Car (34 yorum, 4,6), Aliağa Acar Araç Kiralama (8 yorum, 5,0), Aliağa Gümüş Araç Kiralama (9 yorum, 5,0). Rentwin: 7 yorum, 5,0.
- Arama sayfasında Haritalar kutusu (ilk 3 işletme) organik sonuçların üstünde çıkıyor; tıklamaların çoğu orada.

**Sitenin kendisi:**

- Teknik altyapı tamam: sayfa başlıkları, açıklamalar, yapısal veri, site haritası, botlar için hazır sayfalar. Ana sayfa başlığı "Aliağa Araç Kiralama | Rentwin", tek H1 "Aliağa Araç Kiralama".
- Dizinde 31 sayfa var, 65 sayfa dizin dışında. Dizin dışı olanların çoğu aynı modelin farklı araçlarına ait, birbirinin aynısı olan araç sayfaları ve `/en` kopyaları; bunlar zaten başka bir sayfaya yönlendirilmiş durumda, ciddi bir sorun değil.
- **Dış bağlantı: 6 adet, yalnızca 2 siteden** (kolaybull.com, yandex.com). Asıl zayıflık bu: Google'ın gözünde sitenin güvenilirliği henüz çok düşük.

## 2. Neden geride kalıyoruz

1. **Bilinirlik (otorite) zayıf.** Rakiplerin ve platformların yıllardır biriken bağlantıları var; Rentwin'e 2 site bağlantı veriyor. Site de yeni.
2. **Haritalar'da öne çıkma sinyalleri az.** Yorum sayısı (7), fotoğraf (1 dış cephe), gönderi ve dizin kayıtları (Yandex, Apple, Bing vb.) rakiplere göre az. Kategoriler, hizmetler ve açıklama 13 Kasım'da düzeltildi; etkisi birkaç haftada görülür.
3. **"Fiyat" aramalarına cevap veren bir sayfa yok.** "aliağa araç kiralama fiyatları" aramasında rakibin `/fiyat-listesi` sayfası çıkıyor; bizim böyle bir sayfamız yok (konum 20).
4. **Arama hacmi çok düşük.** Bu yüzden konum her gün oynuyor; tek başına bir sorun değil, ama ilerlemeyi haftalık ve aylık ortalamayla izlemek gerekiyor.

## 3. Plan

Sıralama etkiye göre. **Sahibi** sütunu işin kimde olduğunu gösterir.

| # | İş | Etki | Sahibi | Durum |
|---|---|---|---|---|
| 1 | **Düzenli yorum toplamak:** her teslimden sonra müşteriye yorum bağlantısını göndermek. Admin panelinde kontrat kapanınca WhatsApp'tan hazır "yorum rica" mesajı açan bir düğme. | Çok yüksek (Haritalar) | Kod: Claude · Gönderme: işletme | Düğme yayında (15 Kas): tamamlanan kontratta "Google Yorumu İste"; her teslimden sonra kullanılmalı |
| 2 | **Google profiline gerçek fotoğraflar:** ofis, tabela, araçlar, teslim anı (en az 10). | Yüksek (Haritalar) | İşletme | Bekliyor |
| 3 | **Haftalık Google gönderisi** (her gönderi onayla). | Orta | Claude | 1. gönderi 12 Kasım'da, 2. (Skoda Octavia) 21 Kasım'da |
| 4 | **Dizin kayıtları:** Bing Places (Google profilinden içe aktarılabilir), Apple Business Connect, Yandex Business, Foursquare ve yerel rehberler. Adres, telefon ve site her yerde birebir aynı yazılmalı. | Yüksek (Haritalar + otorite) | Hesaplar: işletme · Doldurma: Claude | Önerildi |
| 5 | **Fiyat listesi sayfası** (`/arac-kiralama-fiyatlari`): model bazında günlük ve aylık fiyat (aralık) tablosu. "aliağa araç kiralama fiyatları" aramasını hedefler. Fiyatlar admin panelindeki araç kayıtlarından otomatik gelir. | Orta-yüksek | Kod: Claude · Fiyat onayı: işletme | Yayında (16 Kas, ca1e92f), sahibi onayladı |
| 5b | **Havalimanı sayfası** (`/lokasyonlar/izmir-havalimani`): ayrı yeni sayfa yerine mevcut sayfa güçlendirildi (iki sayfa aynı aramada yarışmasın diye). Yeni başlık "İzmir Havalimanı Araç Kiralama", yeni metin, 6 soruluk SSS, fiyat sayfasına bağlantı. | Orta (rekabet çok yüksek) | Claude | Yayında (16 Kas, ca1e92f) |
| 6 | **Bağlantı kazanmak:** yolcu360 / enuygun gibi platformlara tedarikçi olarak katılmak (hem bağlantı hem rezervasyon), yerel haber sitelerinde tanıtım haberi (DM'ler atıldı, bkz. `marketing/facebook/README.md` §7), ALOSBİ ve Aliağa Ticaret Odası üye rehberleri. | Yüksek (organik) | İşletme + Claude | Kısmen başladı |
| 7 | **Blog yazıları:** "Aliağa rent a car" (konum 45) ve uzun kuyruk aramalar için ayda 2 yazı. | Orta | Claude (taslak) · İşletme (onay) | Önerildi |
| 8 | **Model sayfaları:** her araç için ayrı, birbirinin aynısı sayfalar yerine her model için tek, zengin bir sayfa. | Düşük-orta | Claude | Sonra |

## Search Console uyarıları (15 Kasım 2026)

"Kopya, Google kullanıcıdan farklı bir standart sayfa seçti" (26) ve "Tarandı - şu anda dizine eklenmiş değil" (3) doğrulamaları başarısız oldu. URL denetimi: İngilizce araç sayfaları o kadar kalıptı ki Google farklı modelleri bile kopya saydı (İngilizce Doblo → Isuzu). Düzeltme (aa1651b): `/en/vehicles/:id` artık `noindex, follow`, araç sayfalarında TR/EN hreflang yok, site haritası yalnız Türkçe araç sayfalarını listeliyor (59 → 46 adres). Canlıda doğrulandı, site haritası yeniden gönderildi.

Aynı modelin birden fazla aracına ait sayfaların "Kopya" ya da "Alternatif sayfa" grubunda kalması beklenen durum. Doğrulama erken başlatılmadı; **1 Aralık 2026 10:00'da zamanlanmış görev** (`rentwin-gsc-indexing-followup`) raporlara bakacak, yalnızca güvenliyse doğrulamayı başlatacak ve ölçümleri aşağıya yazacak.

## 16 Kasım 2026 ölçümü

Sahibi "yine aşağı düştük" dedi. Search Console, son 28 gün: "aliağa araç kiralama" 22 gösterim, 7 tıklama, ortalama konum 11,4. "aliağa" geçen aramalarda günlük konum 9–14 Kasım arasında 10,8 → 59,6 → 52,2 → 19 → 32,5 → 2 oldu; günde 1–17 gösterim var. Düşüş kalıcı değil, düşük hacimden gelen dalgalanma. Havalimanı aramalarının hepsi `/lokasyonlar/izmir-havalimani` sayfasına düşüyordu (15 gösterim, konum 82,5); "fiyat" aramaları ana sayfaya (konum 2,5) ve `/vehicles` sayfasına (konum 56).

Yayından sonra (16 Kasım) URL denetimi: `/arac-kiralama-fiyatlari` "URL Google'da yok" (yeni sayfa). `/lokasyonlar/izmir-havalimani` **dizinde değildi**: Google onu `/lokasyonlar/bursa` sayfasının kopyası saymış (son tarama 15 Kasım, yani yeni metinden önce). İkisi için de sahibinin onayıyla "Dizine eklenmesini iste" gönderildi. Sonuç 1 Aralık'taki zamanlanmış görevde (`rentwin-gsc-indexing-followup`) kontrol edilecek.

## 19–20 Kasım 2026: asıl teknik sorun bulundu

Sahibi, "aliağa araç kiralama" aramasında Dinç Oto Kiralama'nın Instagram sayfasının bizim sitemizin üstünde çıktığını gösterdi. Search Console, son 28 gün (20 Eki – 16 Kas): "aliağa araç kiralama" 38 gösterim, 7 tıklama, ortalama konum 10,5; "aliağa rent a car" konum 40,4.

**Bulgu 1: Google lokasyon sayfalarını boş görüyordu.** `robots.txt` dosyası `/api/` yolunu tamamen kapatıyordu. Sayfalar içeriklerini (lokasyon, araç, blog, kampanya, görsel) bu yoldan çekiyor ve uygulama açılırken bot için hazırlanan HTML'i silip yerine çektiği veriyi koyuyor. Google sayfayı JavaScript ile açtığında veriye ulaşamıyor, her lokasyon sayfası "Lokasyon bilgileri şu anda yüklenemedi" ekranına dönüşüyordu. Search Console canlı testinin ekran görüntüsü (19 Kasım) tam olarak bunu gösterdi. `/lokasyonlar/aliaga` ve `/lokasyonlar/izmir-havalimani` sayfalarının `/lokasyonlar/bursa` sayfasının kopyası sayılmasının nedeni buydu (metin değişiklikleri bu yüzden işe yaramadı). Araç ve blog sayfalarındaki "Kopya" uyarılarının bir kısmı da büyük ihtimalle aynı nedenden.

**Bulgu 2: `www.rentwin.com.tr` yönlendirilmiyordu.** Site www'lu adreste de 200 ile açılıyordu; Google bazı sayfaları (örneğin `/uzun-donem-arac-kiralama`) www'lu adresle dizine almıştı.

**Düzeltme (20 Kasım, 93158e1, sahibinin onayıyla yayında):** `robots.txt` herkese açık, salt okunur veri yollarına izin veriyor (`/api/locations`, `/api/branches`, `/api/campaigns`, `/api/blog`, `/api/reviews`, `/api/car/visitors/`, `/api/files/display/`); yönetim yolları (`/api/*/admin/`) ve geri kalan `/api/` kapalı. `vercel.json`: `www.rentwin.com.tr` → `https://rentwin.com.tr` (308).

**Bulgu 3: Şair Turizm'in ayrı Google profili.** "Şair Turizm Oto Kiralama" profili: 4,9 puan, 36 yorum, kategori "Araba Kiralama Şirketi", adres İzpek ofis, 356. Sk. Kat 2 No 17 (artı kodu QXV9+62; Rentwin QXV9+59), telefon 0544 150 30 30, çalışma saati girilmemiş. Aynı binada, aynı kategoride iki profil var; Google bu durumda genelde birini yerel sonuçlarda gizler, iki profil birbirinin önünü keser. sairturizm.com da "aliağa araç kiralama" aramasında çıkıyor ama rentwin.com.tr'ye bağlantı vermiyor. rentacarss.com'daki Rentwin kaydında görünen 0544 150 30 30 numarası da Şair Turizm'in numarası. **Karar sahibinde:** (a) Şair Turizm'in ana kategorisini transfer/turizm yönüne çekmek (sitesinde VIP transfer hizmeti var), (b) sairturizm.com'dan rentwin.com.tr'ye bağlantı vermek.

**Dinç'in Instagram'ı neden üstte:** Instagram'ın alan adı çok güçlü; profil adında "Oto Kiralama", açıklamasında "Aliağa/İZMİR" geçiyor, 700+ takipçisi var. Bizim sitemiz yeni, dış bağlantısı az ve ana lokasyon sayfası yukarıdaki hata yüzünden dizinde değildi.

## 22 Kasım 2026: "yine aşağıdayız" ölçümü ve kalıcı plan

Sahibi: "Hem Haritalar'da hem aramada aşağıdayız; bazen yukarı çıkıp bazen düşüyoruz, kalıcı olarak üstte durmamız lazım."

**Search Console ("aliağa" geçen bütün aramalar, günlük):** 16–21 Kasım arasında günde 6–21 gösterim. Bu, önceki haftaların 3-4 katı. Konum 17–20 Kasım'da 4,0 → 2,8 → 1,8 → 2,0, 21 Kasım'da 11,0. Son 28 günde "aliağa araç kiralama" 74 gösterim, 7 tıklama, konum 7,0. Önemli sayfaların 10'u da dizinde (`/`, `/lokasyonlar/aliaga`, `/lokasyonlar/izmir-havalimani` dahil); 20 Kasım'daki robots düzeltmesi tuttu.

**Canlı Google (sahibinin Chrome'u, "Aliağa, Samurlu"):**

- Arama sayfası: Haritalar kutusunda Ensar (34 yorum, 24 saat), Acar (8), Gümüş (9, 24 saat). "Yerler" listesinin ilk 10'unda Rentwin yok; organik sonuçların ilk 30'unda da yok.
- Google Haritalar: 2 reklamdan sonra Rentwin **6.** (Ensar, Acar, Gümüş, Bulut, Baran, Rentwin). Profil: 9 yorum, 5,0. Pazar günü 17:00'de kapanıyor; Ensar ve Gümüş 24 saat açık.

Search Console'da konum 2 görünürken canlı aramada sitenin olmaması çelişki değil. O günlerde Haritalar kutusunda çıkıyorduk; kutudaki sıra yer değiştirince gösterim de konum da düşüyor. Dalgalanmanın büyük kısmı Haritalar kutusundan geliyor.

**Dalgalanmanın nedenleri:**

1. **Yorum sayısı az, gelişi düzensiz.** Rentwin 9, Ensar 34, Dinç 36, Şair Turizm 38. Admin → "Google Yorumu İste" listesinde aracı teslim etmiş 67 müşterinin **yalnızca 3'üne** istek gönderilmiş; 64'üne hiç gönderilmemiş.
2. **Aynı binada aynı kategoride iki profil (Şair Turizm).** Google aynı adresteki benzer işletmelerden birini yerel sonuçlarda sık sık gizler; hangisini gizlediği aramadan aramaya değişir. Bu, "bazen var bazen yok" durumunun klasik nedeni. Karar hâlâ sahibinde (Bulgu 3, 19–20 Kasım).
3. **Çalışan yorumu riski.** Ekip bölümünde Operasyon Direktörü olarak görünen Emre Can Çetin'in 17 Kasım tarihli 5 yıldızlı yorumu var. Google çalışan yorumlarını kaldırıyor (Rumeysa Koçan'ın yorumu da böyle gitti) ve tekrar eden durumlarda profili filtreleyebiliyor. Yorumu kendisinin silmesi daha güvenli.
4. **Ana sayfa ile `/vehicles` aynı aramada yarışıyordu.** "aliağa araç kiralama" için Google bazen `/` (66 gösterim, konum 3,0), bazen `/vehicles` (39 gösterim, konum 8,9) sayfasını seçiyordu. İkisinin başlığı ve açıklaması neredeyse aynıydı.
5. **Ana sayfa içerik olarak zayıftı.** Botlara giden HTML'de yalnızca hero vardı (~60 kelime). Tarayıcıdaki hâlinde de "En İyi Tekliflerimiz" bölümü hazır şablondan kalmaydı ve filoda olmayan SUV, off-road, lüks sedan, elektrikli ve spor araç anlatıyordu.

**Sitede yapılanlar (22 Kasım, yayın bekliyor):**

- Ana sayfaya "Aliağa'da Araç Kiralama" bölümü: ofis, sanayi bölgesi (STAR, Petkim, ALOSBİ, Nemrut limanları), havalimanı teslimi, yakın ilçeler, kiralama şartları ve Aliağa ofisi, fiyat listesi, aylık kiralama, ticari araç ve havalimanı sayfalarına açıklayıcı bağlantılar.
- "En İyi Tekliflerimiz" gerçek hizmetlerle yeniden yazıldı (günlük binek, aylık, panelvan, çift kabin, havalimanı, şirketlere faturalı). "Ne Yapıyoruz"daki "Premium Otomobil Kiralama" yerine "Minibüs ve Yolcu Vanı Kiralama". Popüler araçlar ve araç listesi metinlerinden SUV ve lüks sedan çıkarıldı.
- `/vehicles` başlığı "Kiralık Araçlar: Binek, Panelvan ve Kamyonet | Rentwin" oldu; "Aliağa araç kiralama" artık yalnızca ana sayfanın hedefi.
- Botlara giden ana sayfa HTML'i artık hero'nun altında bütün bölümleri (Aliağa bölümü dahil) içeriyor.
- Yapısal veride (AutoRental) `areaServed` listesinin başına Aliağa (City) eklendi.

**Kalıcı üst sıra için yapılacaklar (sıra etkiye göre):**

| # | İş | Kim | Not |
|---|---|---|---|
| 1 | 64 müşteriye yorum isteği: günde 8–10 kişi, 1 hafta içinde bitecek şekilde. Sonra her teslimde aynı gün. | İşletme | Hepsi bir günde gönderilmez; ani yorum yığılması Google'ın filtresine takılabilir. Hedef: Aralık sonunda 30+ yorum. |
| 2 | Şair Turizm profili kararı: ana kategoriyi transfer/turizm yapmak ya da profilleri ayrıştırmak; sairturizm.com'dan rentwin.com.tr'ye bağlantı. | Karar: işletme | **22 Kasım: sahibi Şair'e dokunulmamasını istedi;** Şair çıktığında müşteri yine aynı işletmeye geliyor. Odak yorum toplamak (madde 1). |
| 3 | Emre Can Çetin'in yorumunu kendisinin silmesi. Aile, çalışan ve tanıdıktan yorum istenmez. | İşletme | |
| 4 | Gerçek fotoğraflar: tabela, ofis, araçlar, teslim anı (10+), sonra her ay birkaç yeni. | İşletme çeker · Claude yükler | Hâlâ bekliyor. |
| 5 | Çalışma saatleri: telefon ve WhatsApp'tan gerçekten hizmet veriliyorsa saatler uzatılır (özellikle Pazar). Gerçek olmayan saat yazılmaz. | Karar: işletme | "Şu an açık" olanlar öne çıkıyor. **22 Kas: sahibinin isteğiyle Google profili her gün 24 saat açık yapıldı** (Google incelemesinde). |
| 6 | Haftalık Google gönderisi. | Claude (onayla) | |
| 7 | Dizin kayıtları ve hatalı kayıtların düzeltilmesi: Bulurum.com ve İzmir İş Rehberi (ikisi de bu aramada ilk sayfada), Yandex, Bing Places, Apple Business Connect; rentacarss.com'daki yanlış telefon. | Hesaplar: işletme · Doldurma: Claude | Ad, adres, telefon her yerde birebir aynı. |
| 8 | Ayda 2 blog yazısı (ör. "Aliağa'da aylık araç kiralama rehberi", "Petkim/STAR projeleri için araç"). | Claude taslak · İşletme onay | 22 Kas: 3 yazı sahibinin onayıyla yayında (gezi rotaları, ticari araç seçimi, proje ekipleri için araç planlama). Taslaklar ve konu seçimi: `marketing/blog/taslaklar-kasim-2026.md`. Dizine ekleme isteği 23 Kasım görevinde. |

### 22 Kasım akşam ölçümü (Pazar ~22:00, sahibinin Chrome'u)

Google Haritalar, reklamlar hariç sıra:

| Arama | Rentwin | Önündekiler |
|---|---|---|
| aliağa araç kiralama | **6.** | Ensar (34 yorum, 24 saat), Gümüş (9, 24 saat), Dinç (36), Acar (8), Şair (38) |
| araç kiralama (ofis çevresi) | **7.** | Ensar, Baran (1, 24 saat), Dinç, Gümüş (24 saat), Cemak (9), Acar |
| aliağa rent a car | ilk 8'de yok | Adında "Aliağa" ya da "Rent a Car" geçenler ve 24 saat açıklar |

Profil 10 yorum, 5,0; cevapsız yorum yok. Cemal Eyüboğlu'nun 2 hafta önceki yorumu (o zaman cevaplanmış) sayıya yeni eklendi. Google'ın "profilinizi tamamlayın" listesinde kalan tek madde **vitrin fotoğrafı** (ofisin dışarıdan görünüşü). Yorum isteği hâlâ 68 müşteriden yalnızca 3'üne gitmiş.

Bu ölçümden çıkanlar:

- **Gece saatinde 24 saat açık olanlar öne geçiyor.** Ensar, Gümüş ve Baran Rentwin'in önünde. Saat uzatma ancak telefon ya da WhatsApp'tan gerçekten hizmet veriliyorsa yapılabilir.
- **Adında "Aliağa" ve "Rent a Car" geçen rakipler kelime avantajı alıyor.** Bu bizim için yasak; ada kelime eklemek profilin askıya alınmasına yol açar.
- **Kalan en büyük fark yorum sayısı.** Ensar 34, Dinç 36, Şair 38; Rentwin 10.
- **Hatalı rehber kaydı:** "rentwin aliaga" aramasında rentacarss.com, Rentwin adının yanında Şair'in telefonunu (0544 150 30 30) gösteriyor. Kayıt düzeltilmeli.
- **Listedeki iki satır:** Şair Turizm şirketi ve Emre Can Çetin de yorum isteği listesinde. İkisine istek gönderilmemeli.

## 4. Nasıl ölçülecek

- Her 2 haftada bir Search Console: "aliağa araç kiralama", "aliaga rent a car", "aliağa araç kiralama fiyatları" sorgularının 28 günlük ortalama konumu ve gösterimi.
- Haritalar'da "aliağa araç kiralama" sırası (bugün 8).
- Google profilindeki yorum sayısı (bugün 7) ve dış bağlantı sayısı (bugün 6 bağlantı, 2 site).
