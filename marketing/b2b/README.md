# Kurumsal teklif e-postaları (Aliağa firmaları)

Aliağa Ticaret Odası üyelerinden çıkarılan iletişim listesine (`C:\temp\Aliaga-Firmalar-Iletisim-Listesi.xlsx`, 17 Kasım 2026) gönderilecek araç kiralama teklif e-postaları. Liste kişisel/firma iletişim bilgisi içerdiği için bu depoya eklenmedi.

**26 Kasım 2026'dan beri e-postalarda fiyat yok** (sahibi: "fiyat belirtmeden ilerleyeceğiz"). Firma araç tipini, adedini ve süreyi yazınca özel teklif verilir. 1. partideki 39 firmaya 17 Kasım fiyatlarıyla (sitedeki `/arac-kiralama-fiyatlari`) giden metin gitti. Metindeki her avantaj sitede zaten yazan bir bilgi (depozito yok, şirkete fatura, bakım ve muayene takibi, havalimanı teslimi, 7/24 açık ofis, toplu kiralama). Bağlantı verilen site sayfaları fiyatları göstermeye devam ediyor.

## Gönderim planı (17 Kasım 2026)

- **Alıcılar:** "İletişim Bulunanlar" sayfasından e-postası olan, önceliği Düşük olmayan firmalar; aynı adresi paylaşan şubeler birleştirildi; perakende zincirleri, Rentwin'in kendi şirketleri (Şair Turizm, Movilo) ve araç kiralama rakipleri (NACE 77.1) çıkarıldı. Sonuç: **175 adres** (45 büyük tesis şablonu, 130 KOBİ şablonu).
- **Takvim:** iş günlerinde günde en fazla 40: 18, 19, 20, 23 Kasım (40'ar) ve 24 Kasım (15).
- **Gönderen:** info@rentwin.com.tr, webmail https://webmail.maillb.com (Atak Domain "Mail LB"; 26 Kasım itibarıyla yeni arayüz `/app/`); oturumu sahibi açar. Gönderim Claude in Chrome ya da uygulamanın kendi tarayıcısıyla yapılır. İmza: Ali Koçan.
- **Akış:** Zamanlanmış görev `rentwin-b2b-teklif-epostalari` her iş günü ~09:30'da o günün partisini ve örnek metinleri gösterir, webmail'e kendi adresine örnek taslak kaydeder, **sahibinin sohbette açık onayını bekler**, sonra tek tek gönderir. Geri dönen ve "çıkmak istiyorum" diyen adresleri işaretler; yanıtlara cevap vermez.
- **Dosyalar (depoda değil):** `C:\temp\rentwin-b2b\send-plan.json` (alıcı, konu, metin, durum), `Gonderim-Plani.xlsx` (takip tablosu), `mark.cjs` (durum kaydı).
- Tüm partiler bitince görev kendini kapatır ve yanıt vermeyenlere tek bir hatırlatma (Şablon 3) için ayrı görev önerir.

18 Kasım 2026: sahibinin isteğiyle Citroën C3, Isuzu NPR3D ve Fiat Ducato tekliflerden çıkarıldı (şablonlar ve bekleyen tüm e-postalar).

26 Kasım 2026: sahibinin isteğiyle fiyatlar çıkarıldı. Bekleyen 136 e-posta (40 büyük tesis, 96 KOBİ) yeni metinlere geçirildi; fiyat listesi yerine "Filomuzdan bazı araçlar", sonunda "Fiyat; araç tipine, adedine ve süreye göre belirleniyor". Şablon 1'in konusundan "teklifi" çıktı, bağlantısı fiyat sayfası yerine `/uzun-donem-arac-kiralama`. Hatırlatma (Şablon 3) her iki gruba uyacak şekilde fiyattan bahsetmiyor. Eski plan `send-plan.before-fiyatsiz.json` olarak saklandı.

**26 Kasım 2026, 1. partinin sonuçları (gelen kutusu):** 40 e-postanın 34'ü teslim edildi. 6'sı ulaşmadı:
- Tüpraş: posta kutusu dolu.
- Ege Hurda: alan adı yok.
- Erdem İnşaat: adres yok.
- Ege Gemi, İnaltaş İnşaat ve GDK Endüstriyel: alıcının sunucusu e-postayı spam saydı (cPanel filtresi, skor 152–164).

Rentwin tarafı temiz: gönderen sunucu (smx2.atakmail.com, 185.46.43.50) SPF aralığında, ters DNS doğru, DKIM (`mail` seçicisi) ve DMARC var, Spamhaus/SpamCop/Barracuda'da değil. **Güneş Paslanmaz 19 Kasım'da yanıt verdi** (HGS'nin faturaya nasıl yansıdığı ve iki kez KDV eklenip eklenmediği, km sınırı, Egea'da iskonto var mı); 26 Kasım itibarıyla yanıtlanmadı.

**26 Kasım 2026, 2. parti:** Tüpraş (kurumsal.iletisim@) dahil 40 e-posta, fiyatsız metinle, sahibinin onayıyla uygulamanın tarayıcısından gönderildi; hepsi Gönderilenler'de. Webmail'in arayüzü değişti (`/app/`, Svelte), 18 Kasım'daki IceWarp seçicileri artık geçersiz. Görevdeki teknik notlar yenilendi.

Aynı gün 2 geri dönüş:
- Demar Marine: adres yok (Office 365).
- Ark Halat: spam reddi, skor 164.

Ark Halat ve Ege Gemi aynı barındırma firmasında (aysima.net) ve ikisi de aynı skorla reddetti; metin farklı olduğu hâlde (fiyatlı ve fiyatsız) skor değişmedi. Sebep büyük ihtimalle o sunucunun kendi kuralı. Gönderen IP'si 10 küçük kara listede daha (UCEPROTECT, SORBS, PSBL, Mailspike vb.) sorgulandı, hiçbirinde yok. Bu firmalara telefonla ulaşmak daha doğru.

**Güneş Paslanmaz'a yanıt (26 Kasım, 11:36, sahibinin onayıyla, muhasebe@ bilgide):**
- HGS ödenen tutarla, kapsadığı tarih aralığı yazılarak yansıtılır, üstüne KDV eklenmez.
- Aylık kiralamada araç başına 3.000 km dahil, aşım km başına 6 TL + KDV.
- Adet ve süreye göre iskonto var; net teklif için araç sayısı ve süre soruldu.

Sahibine ayrıca telefonla aranması önerildi.

**Gönderim kaydı:** 18 Kasım 2026, 1. parti: 40 e-posta gönderildi (sabahki görev webmail oturumu kapalı olduğu için durdu; sahibinin onayıyla ana oturumdan gönderildi). 1 geri dönüş: info@tupras.com.tr (alıcının posta kutusu dolu; alternatif kurumsal.iletisim@tupras.com.tr, sahibinin onayı gerekir). 1 otomatik yanıt ("ilgili ekiplere iletildi"). Kalan 135 firma iş günü partileriyle (19, 20, 23, 24 Kasım).

## Gönderirken

- **Kimden:** Mümkünse `info@rentwin.com.tr` adresinden. Gmail gibi ücretsiz adresler firmalarda daha sık spam'e düşer.
- **Kime:** Her firmaya ayrı e-posta. Toplu gönderecekseniz adresleri **Gizli (BCC)** alanına yazın; "Kime"ye toplu yazılırsa herkes birbirinin adresini görür.
- **Hız:** Yeni bir adresten günde 30–50 e-postayla başlayın, tepki geldikçe artırın. Bir günde yüzlerce e-posta spam sayılabilir.
- **Sıra:** Excel'de "Öncelik" sütunu "Çok yüksek" ve "Yüksek" olanlarla başlayın. "Kontrol Edilecekler" sayfasındakilere göndermeden önce sitesine bakın.
- **Listeden çıkma:** Her e-postanın sonunda çıkma cümlesi var. "Almak istemiyorum" diyen firmayı Excel'de işaretleyin ve bir daha yazmayın.
- **Takip:** Yanıt vermeyenlere 7–10 gün sonra bir kez "Hatırlatma" e-postası gönderin, daha fazla değil.
- **Kişiselleştirme:** `[Firma Adı]` yerine firmanın kısa adını yazın (ör. "Ege Gübre"), uzun ticari unvanı değil. Büyük firmalarda e-postayı satın alma birimine yönlendirmelerini isteyin (şablon 1).

Site bağlantılarındaki `utm_` kodu, bu e-postalardan siteye gelenleri Google Analytics'te ayrı görmek içindir.

---

## Şablon 1: Büyük tesisler (rafineri, petrokimya, liman, çelik)

**Konu:** Aliağa'dan kurumsal araç kiralama — Rentwin Araç Kiralama

```
Sayın Yetkili,

[Firma Adı] Satın Alma / İdari İşler birimine iletilmesini rica ederim.

Aliağa'da faaliyet gösteren Rentwin Araç Kiralama olarak tesisinizin binek ve ticari araç ihtiyaçları için günlük ve aylık kiralama hizmeti sunuyoruz. Ofisimiz Aliağa merkezde; araç teslimi, değişimi ve sözleşme işlemleri için İzmir'e gitmenize gerek kalmıyor.

Filomuzdan bazı araçlar:
- Binek: Fiat Egea, Renault Clio, Renault Taliant ve Skoda Octavia (otomatik)
- Ticari: Fiat Fiorino, Fiat Doblo, Ford Transit Çift Kabin
- Personel taşıma: Citroën Jumpy SpaceTourer (otomatik)

Kurumsal kiralamalarda:
- Depozito almıyoruz; fatura şirket ünvanınıza düzenlenir.
- Periyodik bakım ve muayene takibi bizde.
- Aynı modelden birden fazla araçla ekipler için toplu kiralama yapabiliyoruz.
- Kilometre limiti ve aşım ücreti sözleşmede açıkça yazılır.
- Ofisimiz 7/24 açık; talep ederseniz İzmir Adnan Menderes Havalimanı'nda da teslim ediyoruz.

Kurumsal ve uzun dönem kiralama:
https://rentwin.com.tr/uzun-donem-arac-kiralama?utm_source=email&utm_medium=b2b&utm_campaign=aliaga-kurumsal

Fiyat; araç tipine, adedine ve kiralama süresine göre belirleniyor. İhtiyacınızı iletirseniz size özel teklifimizi aynı gün gönderelim.

Saygılarımla,

[Ad Soyad]
Rentwin Araç Kiralama
0507 350 31 35 · info@rentwin.com.tr
Atatürk Mah. 356 Sk. No: 16/31, Aliağa / İzmir
rentwin.com.tr

Bu e-postayı almak istemiyorsanız yanıt olarak bildirmeniz yeterlidir; size tekrar yazmayız.
```

---

## Şablon 2: KOBİ'ler (inşaat, gemi söküm, makina, lojistik, hizmet müteahhitleri)

**Konu:** [Firma Adı] için aylık ticari araç kiralama — Aliağa

```
Merhaba [Firma Adı] ekibi,

Aliağa'dan Rentwin Araç Kiralama olarak yazıyorum. Şantiye, saha ve servis işleriniz için panelvan, çift kabin kamyonet ve binek araçları günlük ya da aylık kiralıyoruz.

Filomuzdan bazı araçlar:
- Fiat Fiorino
- Fiat Doblo
- Ford Transit Çift Kabin
- Binek: Fiat Egea ve diğer modeller

Depozito almıyoruz, faturayı şirketinize kesiyoruz. Aynı modelden birden fazla aracımız olduğu için ekibinize toplu araç verebiliyoruz. Bakım ve muayene takibi bizde; ofisimiz Aliağa'da ve 7/24 açık.

Ticari araçlarımız:
https://rentwin.com.tr/ticari-arac-kiralama?utm_source=email&utm_medium=b2b&utm_campaign=aliaga-kobi

Fiyat; araç tipine, adedine ve süreye göre belirleniyor. Kaç araca, ne kadar süreyle ihtiyacınız olduğunu yazarsanız size özel teklif hazırlayayım. Telefonla da ulaşabilirsiniz: 0507 350 31 35.

İyi çalışmalar,

[Ad Soyad]
Rentwin Araç Kiralama
0507 350 31 35 · info@rentwin.com.tr · rentwin.com.tr

Bu tür e-postaları almak istemiyorsanız yanıt olarak bildirmeniz yeterli.
```

---

## Şablon 3: Hatırlatma (7–10 gün sonra, yanıt gelmeyenlere bir kez)

**Konu:** Ynt: Aliağa'dan kurumsal araç kiralama

```
Merhaba,

Geçen hafta size Rentwin Araç Kiralama'yı tanıtmak için yazmıştım. Önümüzdeki dönemde [Firma Adı] için binek ya da ticari araç ihtiyacı olursa, araç tipini, adedini ve süreyi yazmanız yeterli; teklifimizi aynı gün gönderiyorum.

Araç filomuz: https://rentwin.com.tr/vehicles?utm_source=email&utm_medium=b2b&utm_campaign=aliaga-hatirlatma

İyi çalışmalar,
[Ad Soyad] · Rentwin Araç Kiralama · 0507 350 31 35
```

---

## Takip tablosu önerisi

Excel'in "İletişim Bulunanlar" sayfasına üç sütun ekleyin: **Gönderim tarihi**, **Yanıt** (Olumlu / Olumsuz / Çıkmak istedi), **Not**. Olumlu dönenleri admin panelinde müşteri olarak açın; ilk kontrattan sonra onlara da "Google Yorumu İste" mesajı gönderilebilir.
