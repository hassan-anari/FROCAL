export const mobileEase = [0.22, 1, 0.36, 1] as [number, number, number, number];

export const mobileMotion = {
  micro: { duration: 0.14, ease: mobileEase },
  tab: { duration: 0.18, ease: mobileEase },
  page: { duration: 0.2, ease: mobileEase },
  overlay: { duration: 0.22, ease: mobileEase },
  reveal: { duration: 0.28, ease: mobileEase },
  cinematic: { duration: 0.52, ease: mobileEase },
} as const;
