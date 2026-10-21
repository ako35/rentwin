// Same palette as the home screen (src/app/index.js) so every screen reads as
// one app.
export const COLORS = {
  ink: "#17231f",
  muted: "#75817b",
  subtle: "#98a29c",
  green: "#176b4d",
  greenSoft: "#e5f2eb",
  canvas: "#f5f7f4",
  line: "#e7ebe7",
  card: "#ffffff",
  amber: "#a45b10",
  amberSoft: "#fff7e9",
  amberLine: "#f4e1bd",
  red: "#a33c2d",
  redSoft: "#fff0ed",
};

export const CARD = {
  backgroundColor: COLORS.card,
  borderRadius: 17,
  borderWidth: 1,
  borderColor: COLORS.line,
  padding: 15,
};

export const SCREEN_HEADER = {
  headerStyle: { backgroundColor: COLORS.canvas },
  headerShadowVisible: false,
  headerTintColor: COLORS.ink,
  headerTitleStyle: { fontWeight: "800", color: COLORS.ink },
};
