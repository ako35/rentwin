import AsyncStorage from "@react-native-async-storage/async-storage";

// Mobile's own token store — unrelated to the web admin's localStorage key,
// this app is a separate device/sandbox. Kept as a tiny module (not a
// context/hook) so api/client.js can read the token synchronously-ish
// without needing to be inside a component tree.
const TOKEN_KEY = "rentwin-staff-token";
const USER_KEY = "rentwin-staff-user";

export const saveSession = async (token, user) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);

export const getUser = async () => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
};
