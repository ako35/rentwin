# Kurumsal teklif e-postaları (Aliağa firmaları)

Aliağa Ticaret Odası üyelerinden çıkarılan iletişim listesine (`C:\temp\Aliaga-Firmalar-Iletisim-Listesi.xlsx`, 17 Kasım 2026) gönderilecek araç kiralama teklif e-postaları. Liste kişisel/firma iletişim bilgisi içerdiği için bu depoya eklenmedi.

Fiyatlar 17 Kasım 2026'da sitedeki fiyat sayfasından (`/arac-kiralama-fiyatlari`) alındı; değişirse e-postadaki tabloyu da güncelleyin. Metindeki her avantaj sitede zaten yazan bir bilgi (depozito yok, şirkete fatura, bakım ve muayene takibi, havalimanı teslimi, 7 gün açık ofis, toplu kiralama).

## Gönderim planı (17 Kasım 2026)

- **Alıcılar:** "İletişim Bulunanlar" sayfasından e-postası olan, önceliği Düşük olmayan firmalar; aynı adresi paylaşan şubeler birleştirildi; perakende zincirleri, Rentwin'in kendi şirketleri (Şair Turizm, Movilo) ve araç kiralama rakipleri (NACE 77.1) çıkarıldı. Sonuç: **175 adres** (45 büyük tesis şablonu, 130 KOBİ şablonu).
- **Takvim:** iş günlerinde günde en fazla 40: 18, 19, 20, 23 Kasım (40'ar) ve 24 Kasım (15).
- **Gönderen:** info@rentwin.com.tr, webmail https://webmail.maillb.com (Atak Domain "Mail LB"); oturumu sahibi açar. İmza: Ali Koçan.
- **Akış:** Zamanlanmış görev `rentwin-b2b-teklif-epostalari` her iş günü ~09:30'da o günün partisini ve örnek metinleri gösterir, webmail'e kendi adresine örnek taslak kaydeder, **sahibinin sohbette açık onayını bekler**, sonra tek tek gönderir. Geri dönen ve "çıkmak istiyorum" diyen adresleri işaretler; yanıtlara cevap vermez.
- **Dosyalar (depoda değil):** `C:\temp\rentwin-b2b\send-plan.json` (alıcı, konu, metin, durum), `Gonderim-Plani.xlsx` (takip tablosu), `mark.cjs` (durum kaydı).
- Tüm partiler bitince görev kendini kapatır ve yanıt vermeyenlere tek bir hatırlatma (Şablon 3) için ayrı görev önerir.

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

**Konu:** Aliağa'dan kurumsal araç kiralama teklifi — Rentwin Araç Kiralama

```
Sayın Yetkili,

[Firma Adı] Satın Alma / İdari İşler birimine iletilmesini rica ederim.

Aliağa'da faaliyet gösteren Rentwin Araç Kiralama olarak tesisinizin binek ve ticari araç ihtiyaçları için günlük ve aylık kiralama hizmeti sunuyoruz. Ofisimiz Aliağa merkezde; araç teslimi, değişimi ve sözleşme işlemleri için İzmir'e gitmenize gerek kalmıyor.

Aylık kiralama fiyatlarımızdan bazıları (KDV hariç):

  Binek    Citroën C3, Fiat Egea .................. 45.000 TL'den
           Renault Clio ........................... 55.000 TL
           Renault Taliant, Skoda Octavia (otomatik) 75.000 TL
  Ticari   Fiat Fiorino ........................... 55.000 TL
           Fiat Doblo ............................. 60.000 TL
           Fiat Ducato, Ford Transit Çift Kabin ... 85.000 TL
  Personel Citroën Jumpy SpaceTourer (otomatik) .. 110.000 TL

Kurumsal kiralamalarda:
- Depozito almıyoruz; fatura şirket ünvanınıza düzenlenir.
- Periyodik bakım ve muayene takibi bizde.
- Aynı modelden birden fazla araçla ekipler için toplu kiralama yapabiliyoruz.
- Kilometre limiti ve aşım ücreti sözleşmede açıkça yazılır.
- Ofisimiz haftanın 7 günü açık; talep ederseniz İzmir Adnan Menderes Havalimanı'nda da teslim ediyoruz.

Tüm araçlar ve güncel fiyatlar:
https://rentwin.com.tr/arac-kiralama-fiyatlari?utm_source=email&utm_medium=b2b&utm_campaign=aliaga-kurumsal

İhtiyaç duyduğunuz araç tipini, adedini ve süreyi iletirseniz size özel teklifimizi aynı gün gönderelim.

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
Merhaba,

Aliağa'dan Rentwin Araç Kiralama olarak yazıyorum. Şantiye, saha ve servis işleriniz için panelvan, çift kabin kamyonet ve binek araçları günlük ya da aylık kiralıyoruz.

Aylık fiyatlarımızdan bazıları (KDV hariç):
- Fiat Fiorino: 55.000 TL
- Fiat Doblo: 60.000 TL
- Ford Transit Çift Kabin / Fiat Ducato: 85.000 TL
- Isuzu NPR3D kamyonet: 110.000 TL
- Binek (Citroën C3, Fiat Egea): 45.000 TL'den

Depozito almıyoruz, faturayı şirketinize kesiyoruz. Aynı modelden birden fazla aracımız olduğu için ekibinize toplu araç verebiliyoruz. Bakım ve muayene takibi bizde; ofisimiz Aliağa'da ve haftanın 7 günü açık.

Tüm araçlar ve fiyatlar:
https://rentwin.com.tr/ticari-arac-kiralama?utm_source=email&utm_medium=b2b&utm_campaign=aliaga-kobi

Kaç araca, ne kadar süreyle ihtiyacınız olduğunu yazarsanız size özel teklif hazırlayayım. Telefonla da ulaşabilirsiniz: 0507 350 31 35.

İyi çalışmalar,

[Ad Soyad]
Rentwin Araç Kiralama
0507 350 31 35 · info@rentwin.com.tr · rentwin.com.tr

Bu tür e-postaları almak istemiyorsanız yanıt olarak bildirmeniz yeterli.
```

---

## Şablon 3: Hatırlatma (7–10 gün sonra, yanıt gelmeyenlere bir kez)

**Konu:** Ynt: Aliağa'dan kurumsal araç kiralama teklifi

```
Merhaba,

Geçen hafta araç kiralama fiyatlarımızı iletmiştim. Önümüzdeki dönemde [Firma Adı] için binek ya da ticari araç ihtiyacı olursa, araç tipini ve süreyi yazmanız yeterli; teklifimizi aynı gün gönderiyorum.

Güncel fiyatlar: https://rentwin.com.tr/arac-kiralama-fiyatlari?utm_source=email&utm_medium=b2b&utm_campaign=aliaga-hatirlatma

İyi çalışmalar,
[Ad Soyad] · Rentwin Araç Kiralama · 0507 350 31 35
```

---

## Takip tablosu önerisi

Excel'in "İletişim Bulunanlar" sayfasına üç sütun ekleyin: **Gönderim tarihi**, **Yanıt** (Olumlu / Olumsuz / Çıkmak istedi), **Not**. Olumlu dönenleri admin panelinde müşteri olarak açın; ilk kontrattan sonra onlara da "Google Yorumu İste" mesajı gönderilebilir.
