import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "@tanstack/react-router";
import { bannerSchema } from "@/integrations/api/b3Contracts";
import { b3Request } from "@/integrations/api/b3";
import {
  safeDestination,
  navigateSafely,
} from "@/integrations/api/safeNavigation";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import styles from "@/pages/BasePage.module.css";

/** Banner-only parity with WEDCAL's literal HTTPS validation; general app navigation stays unchanged. */
function safeBannerUrl(value: string): boolean {
  if (value.startsWith("/")) return true; // Already checked against the internal route policy.
  if (value.length > 2048 || value.includes("#") || /%(?![0-9a-f]{2})/i.test(value)) return false;
  try {
    const literal = /^https:\/\/([^/?#]+)([^?#]*)/i.exec(value);
    if (!literal) return false;
    const decoded = decodeURIComponent(value);
    const path = decodeURIComponent(literal[2]);
    if (/[\u0000-\u001f\u007f\\<>"`%]/.test(decoded) || path.startsWith("//") || path.split("/").some(part => part === "." || part === "..")) return false;
    const host = new URL(value).hostname;
    return host.startsWith("[") || host.replace(/\.$/, "").split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
  } catch { return false; }
}

export function validBanner(
  value: ReturnType<typeof bannerSchema.parse>["banner"],
) {
  if (!value) return null;
  // An approved asset may share the Mini App origin. Image delivery is not a
  // navigable game route; validate its exact HTTPS asset path independently.
  if (
    !/^https:\/\//i.test(value.image_url) ||
    /[\u0000-\u0020\u007f\\]/.test(value.image_url)
  )
    return null;
  let url: URL;
  try {
    url = new URL(value.image_url);
  } catch {
    return null;
  }
  if (url.username || url.password || url.protocol !== "https:") return null;
  if (
    !new RegExp(
      `^/api/v1/content/banner-assets/[a-f0-9-]{36}/${value.version}\\.webp$`,
    ).test(url.pathname) ||
    url.search ||
    url.hash ||
    (url.port && url.port !== "443")
  )
    return null;
  const destination = value.destination
    ? safeDestination(value.destination)
    : null;
  if (
    value.destination &&
    (!destination || !safeBannerUrl(value.destination) ||
      (value.destination_type === "TELEGRAM" &&
        (destination.kind !== "telegram" || new URL(value.destination).hostname !== "t.me")) ||
      (value.destination_type === "HTTPS" && !value.destination.startsWith("/") && new URL(value.destination).hostname === "t.me"))
  )
    return null;
  if (Boolean(value.destination) !== Boolean(value.destination_type))
    return null;
  return value;
}
export function BasePromoBanner() {
  const { adapter } = useTelegram();
  const navigate = useNavigate();
  const [ready, setReady] = useState("");
  const [failed, setFailed] = useState("");
  const query = useQuery({
    queryKey: ["content", "banners", "BASE"],
    queryFn: ({ signal }) =>
      b3Request("/content/banners/BASE", bannerSchema, { signal }),
    staleTime: 0,
    refetchInterval: 10_000,
    refetchOnWindowFocus: "always",
    retry: false,
  });
  const banner = query.isError ? null : validBanner(query.data?.banner ?? null);
  const key = banner ? `${banner.id}:${banner.version}` : "";
  return (
    <AnimatePresence initial={false} mode="wait">
      {banner && failed !== key ? (
        <motion.aside
          key={key}
          className={styles.promoSlot}
          style={ready === key ? undefined : { display: "none" }}
          initial={{ opacity: 0, y: -7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={mobileMotion.reveal}
          aria-label="Promotional banner placement"
        >
          <div className={styles.promoBanner}>
            {banner.destination ? (
              <a
                href={banner.destination}
                onClick={(event) => {
                  event.preventDefault();
                  const destination = safeDestination(banner.destination);
                  if (banner.destination_type === "HTTPS" && destination && destination.kind !== "internal") adapter.openExternalLink(destination.url);
                  else navigateSafely(banner.destination, adapter, (to) => {
                    void navigate({ to });
                  });
                }}
              >
                <img
                  className={`${styles.promoImage} ${styles.promoImageReady}`}
                  src={banner.image_url}
                  alt={banner.alt_text}
                  width={1200}
                  height={260}
                  onLoad={(event) => {
                    if (
                      event.currentTarget.naturalWidth /
                        event.currentTarget.naturalHeight ===
                      60 / 13
                    )
                      setReady(key);
                    else setFailed(key);
                  }}
                  onError={() => setFailed(key)}
                />
              </a>
            ) : (
              <img
                className={`${styles.promoImage} ${styles.promoImageReady}`}
                src={banner.image_url}
                alt={banner.alt_text}
                width={1200}
                height={260}
                onLoad={(event) => {
                  if (
                    event.currentTarget.naturalWidth /
                      event.currentTarget.naturalHeight ===
                    60 / 13
                  )
                    setReady(key);
                  else setFailed(key);
                }}
                onError={() => setFailed(key)}
              />
            )}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
