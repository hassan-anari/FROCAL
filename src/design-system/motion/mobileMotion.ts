export const mobileEase = [0.22, 1, 0.36, 1] as [number, number, number, number];

export const mobileMotion = {
  micro: { duration: 0.11, ease: mobileEase },
  tab: { duration: 0.16, ease: mobileEase },
  page: { duration: 0.18, ease: mobileEase },
  overlay: { duration: 0.19, ease: mobileEase },
  reveal: { duration: 0.24, ease: mobileEase },
  cinematic: { duration: 0.48, ease: mobileEase },
} as const;
