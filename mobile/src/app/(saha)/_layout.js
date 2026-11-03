import { Stack } from "expo-router";
import { COLORS, SCREEN_HEADER } from "../../constants/theme";

export default function SahaLayout() {
  return (
    <Stack
      screenOptions={{
        ...SCREEN_HEADER,
        headerTitleAlign: "center",
        contentStyle: { backgroundColor: COLORS.canvas },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="contract/[id]" options={{ title: "Kontrat" }} />
      <Stack.Screen name="capture/[id]" options={{ title: "Fotoğraflar" }} />
    </Stack>
  );
}

