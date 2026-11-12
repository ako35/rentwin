# Google İşletme Profili: gönderi planı

Rentwin'in Google İşletme Profili, Google Arama ve Haritalar'da "rentwin" ya da "Aliağa araç kiralama" arayanlara görünen işletme kartıdır. Profile eklenen gönderiler bu kartın "Güncellemeler" bölümünde çıkar.

- Yorum bağlantısı: https://g.page/r/CTKESQe2UScrEBM/review
- Gönderi türleri: **Güncelleme** (genel duyuru), **Teklif** (kampanya; başlangıç ve bitiş tarihi gösterir), **Etkinlik**.

## Kurallar

- **Görsel:** Google gönderi görselini yatay 4:3 oranında gösterir. Facebook'taki 1080×1350 dikey görsellerin üstü ve altı kesilir. Bu yüzden Google için ayrı 1200×900 görsel kullanılır (`gorseller/`).
- **Telefon numarası:** Gönderi metnine telefon numarası yazılmaz; Google bu tür gönderileri reddedebiliyor. Telefon zaten profilde duruyor; gerekirse "Şimdi ara" düğmesi seçilir.
- **Bağlantı:** Her gönderinin düğmesi sitedeki ilgili sayfaya gider ve sonuna şu takip kodu eklenir: `utm_source=google&utm_medium=business_profile&utm_campaign=<konu>`.
- **Sıklık:** Haftada bir gönderi.

## Gönderiler

| # | Tarih | Tür | Konu | Görsel | Düğme | Durum |
|---|---|---|---|---|---|---|
| 1 | — | Güncelleme | Tanıtım | `01-tanitim.png` | Rezervasyon yap → /vehicles | Taslak, onay bekliyor |

### 1. Tanıtım (Güncelleme) · `gorseller/01-tanitim.png`

```
Aliağa'da günlük ve aylık araç kiralama 🚗

Rentwin olarak Aliağa'da binek araç, panelvan ve çift kabin kamyonet kiralıyoruz. Günlük 2.750 TL + KDV'den, aylık 45.000 TL + KDV'den başlayan fiyatlarla.

✔️ Depozito yok
✔️ İzmir Adnan Menderes Havalimanı'nda teslim
✔️ Şirketlere fatura ve toplu kiralama
✔️ Haftanın 7 günü açığız

Araçları ve fiyatları görmek için "Rezervasyon yap" düğmesine dokunun.
```

Düğme: **Rezervasyon yap** → https://rentwin.com.tr/vehicles?utm_source=google&utm_medium=business_profile&utm_campaign=tanitim

## Sıradaki adaylar

Facebook takvimindeki konular buraya uyarlanabilir (her biri için 1200×900 görsel gerekir):

- Ticari araç kiralama → /ticari-arac-kiralama
- Uzun dönem (aylık) kiralama → /uzun-donem-arac-kiralama
- Havalimanı teslimi
- Güncel kampanyalar (Teklif türünde, tarih aralığıyla) → /kampanyalar

## Profilde bir kerelik eksikler

- [ ] Sosyal profiller: Facebook ve Instagram adresleri
- [ ] Hizmetler: günlük, aylık, ticari araç, havalimanı teslimi (başlangıç fiyatlarıyla)
- [ ] Fotoğraflar: ofis, araçlar, teslim anı
- [ ] Ek kategoriler (ana kategori: Araç kiralama acentesi)
