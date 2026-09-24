// Gerçek KABİS (EGM Kiralık Araç Bildirim Sistemi) istemcisi — kasıtlı
// olarak boş. EGM/Emniyet'ten entegrasyon protokolü (SOAP/REST, kimlik
// doğrulama, alan şeması) elimize geçmeden burada "başarılı" döndürmek,
// sistemde hiç gönderilmemiş bir bildirimi "gönderildi" gibi göstermek
// demektir — bu bir mevzuat riski, o yüzden bilinçli olarak atılmıyor.
//
// Protokol netleştiğinde yapılacak: bu iki fonksiyonun gövdesini gerçek
// SOAP/REST çağrısıyla değiştirmek. routes/kabis.routes.js ve server.js'in
// değişmesi gerekmiyor — sadece burası dolduruluyor.

class KabisNotImplementedError extends Error {
  constructor(message) {
    super(message);
    this.name = "KabisNotImplementedError";
    this.statusCode = 501;
  }
}

// payload: { contractRef, kabisSystem, renter: { fullName, nationalId, phone, address },
//            vehicle: { plate, brand, model }, rentalStart, rentalEnd }
const notifyRentalStart = async (payload) => {
  throw new KabisNotImplementedError(
    "KABİS giriş bildirimi henüz uygulanmadı — EGM entegrasyon protokolü bekleniyor."
  );
};

// payload: { contractRef, kabisSystem, releasedAt }
const notifyRentalEnd = async (payload) => {
  throw new KabisNotImplementedError(
    "KABİS çıkış bildirimi henüz uygulanmadı — EGM entegrasyon protokolü bekleniyor."
  );
};

module.exports = { notifyRentalStart, notifyRentalEnd, KabisNotImplementedError };
