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

## 4. Nasıl ölçülecek

- Her 2 haftada bir Search Console: "aliağa araç kiralama", "aliaga rent a car", "aliağa araç kiralama fiyatları" sorgularının 28 günlük ortalama konumu ve gösterimi.
- Haritalar'da "aliağa araç kiralama" sırası (bugün 8).
- Google profilindeki yorum sayısı (bugün 7) ve dış bağlantı sayısı (bugün 6 bağlantı, 2 site).
