# Rentwin KABİS Proxy

Vercel üzerindeki Rentwin backend'i ile EGM'nin Kiralık Araç Bildirim
Sistemi (KABİS) arasına, sabit IP'li bir VPS üzerinden köprü kuran küçük
bir Express servisi.

## Şu an ne yapıyor, ne yapmıyor

- **Yapıyor:** ayakta durur, paylaşılan sırla (shared secret) korunan iki
  endpoint sunar (`/kabis/notify`, `/kabis/release`), gelen isteği doğrular.
- **Yapmıyor:** KABİS'e gerçek bir bildirim **göndermiyor**. `src/kabis-client.js`
  içindeki iki fonksiyon kasıtlı olarak `501 KABIS_NOT_IMPLEMENTED` döndürüyor,
  çünkü EGM'nin gerçek entegrasyon protokolü (SOAP/REST, kimlik doğrulama,
  zorunlu alanlar) elimizde yok. Sahte bir "başarılı" cevap, sistemde hiç
  gönderilmemiş bir bildirimi "gönderildi" göstermek demek olur — bu bir
  mevzuat riski, o yüzden bilerek atlanmadı.
- Rentwin'in asıl uygulaması (frontend + backend) bu servisi **henüz
  çağırmıyor**. KbsSection.jsx'teki mevcut manuel "KABİS'e bildirdim" akışı
  aynen çalışmaya devam ediyor; bu servis onun yerine geçmeden önce gerçek
  protokolle doldurulmalı.

## Sıradaki gerçek adım

EGM/Emniyet'ten (ya da bir entegratör firmadan) KABİS için API/web servis
dokümanı veya erişim geldiğinde, sadece `src/kabis-client.js`'teki iki
fonksiyonun gövdesi gerçek SOAP/REST çağrısıyla değiştirilecek — routes,
auth, server hiç değişmeyecek. O noktada ayrıca Rentwin backend tarafında
bu servisi çağıran küçük bir istemci eklenip KbsSection'daki manuel akışa
("Gönder" butonu + hata/başarı durumu) bağlanacak.

## VPS kurulumu (DigitalOcean veya Hetzner)

Bu adımları biz yapamıyoruz — hesap/ödeme sizde. Adımlar:

1. **Sunucu oluştur:** DigitalOcean "Droplet" ya da Hetzner "Cloud Server",
   en küçük plan (paylaşılan CPU, ~1GB RAM) yeterli. Ubuntu 22.04/24.04 LTS
   seçin. Oluşturunca elinizde bir **sabit IP** olacak — bu, EGM'ye
   başvururken isteyecekleri "sabit IP" bu.
2. **SSH ile bağlan:**
   ```bash
   ssh root@<VPS_IP>
   ```
3. **Node.js kur** (LTS, örn. 20.x):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt-get install -y nodejs
   npm i -g pm2
   ```
4. **Bu klasörü sunucuya taşı** (yerelden `scp` ile ya da git ile):
   ```bash
   scp -r kabis-proxy root@<VPS_IP>:/opt/kabis-proxy
   ```
5. **Bağımlılıkları kur, .env doldur:**
   ```bash
   cd /opt/kabis-proxy
   npm install --omit=dev
   cp .env.example .env
   # .env içine KABIS_PROXY_SHARED_SECRET için rastgele bir değer:
   openssl rand -hex 32
   ```
6. **pm2 ile başlat ve sunucu yeniden başlayınca otomatik ayağa kalksın:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup   # ekrana yazdırdığı komutu çalıştırın
   ```
7. **Nginx + TLS (dışarıya güvenli erişim için):**
   ```bash
   apt-get install -y nginx certbot python3-certbot-nginx
   cp deploy/nginx.conf.example /etc/nginx/sites-available/kabis-proxy
   # server_name'i kendi alan adınızla değiştirin, DNS A kaydını VPS IP'sine yönlendirin
   ln -s /etc/nginx/sites-available/kabis-proxy /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   certbot --nginx -d kabis.rentwin.com.tr
   ```
8. **Güvenlik duvarı — sadece gerekli portlar açık kalsın:**
   ```bash
   ufw allow 22
   ufw allow 80
   ufw allow 443
   ufw enable
   ```
9. **Doğrula:**
   ```bash
   curl https://kabis.rentwin.com.tr/health
   # {"status":"ok"}
   ```

## Rentwin backend tarafında (ileride)

Vercel proje ayarlarına şu env değişkenleri eklenecek (henüz eklenmedi):

- `KABIS_PROXY_URL` = `https://kabis.rentwin.com.tr`
- `KABIS_PROXY_SHARED_SECRET` = VPS'teki `.env`'de üretilen değerin aynısı
