import AsyncStorage from "@react-native-async-storage/async-storage";

// Yöneticinin en son kullandığı mod: "admin" (yönetim paneli) ya da "saha"
// (günlük program + fotoğraf). Saha ekibinin hepsi Administrator rolünde
// olduğundan, uygulama her açılışta son moda döner — saha telefonu her
// seferinde admin paneline düşmez. Cihaz tercihi; çıkışta silinmez.
const MODE_KEY = "rentwin-app-mode";

export const APP_MODES = ["admin", "saha"];

export const getMode = async () => {
  try {
    const value = await AsyncStorage.getItem(MODE_KEY);
    return APP_MODES.includes(value) ? value : null;
  } catch {
    return null;
  }
};

export const saveMode = async (mode) => {
  try {
    await AsyncStorage.setItem(MODE_KEY, mode);
  } catch {
    // Tercih kaydedilemezse bir sonraki açılış varsayılan moda düşer.
  }
};
