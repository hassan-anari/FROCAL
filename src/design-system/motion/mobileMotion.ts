export const mobileEase = [0.22, 1, 0.36, 1] as [number, number, number, number];

/*
 * Motion timings are tuned for a touch-first Telegram WebView. The visual
 * language stays present, but interactions settle inside roughly 1–2 mobile
 * frames sooner than the previous desktop-feeling timings.
 */
export const mobileMotion = {
  micro: { duration: 0.12, ease: mobileEase },
  tab: { duration: 0.16, ease: mobileEase },
  page: { duration: 0.18, ease: mobileEase },
  overlay: { duration: 0.2, ease: mobileEase },
  reveal: { duration: 0.24, ease: mobileEase },
  cinematic: { duration: 0.52, ease: mobileEase },
} as const;
