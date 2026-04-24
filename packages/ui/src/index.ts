export const brandTheme = {
  colors: {
    ink: "#1c1c1c",
    brand: "#cd2026",
    brandDeep: "#8b1116",
    cream: "#fff7ef",
    sun: "#ffb848",
    sand: "#f4e0c0",
    fog: "#f7f3ee",
    success: "#1f7a4d",
    warning: "#d17f18",
  },
  gradients: {
    hero: "linear-gradient(135deg, #8b1116 0%, #cd2026 58%, #ffb848 100%)",
    panel: "linear-gradient(180deg, rgba(255,247,239,0.92) 0%, rgba(255,255,255,1) 100%)",
    darkPanel: "linear-gradient(180deg, rgba(28,28,28,1) 0%, rgba(58,22,15,1) 100%)",
  },
  radii: {
    card: "24px",
    pill: "999px",
  },
  shadows: {
    card: "0 24px 64px rgba(139, 17, 22, 0.12)",
    lifted: "0 16px 40px rgba(28, 28, 28, 0.18)",
  },
} as const;

export const dashboardShell = {
  maxWidth: "1440px",
  gutter: "24px",
};
