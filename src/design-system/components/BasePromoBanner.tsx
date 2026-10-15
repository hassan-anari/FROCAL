import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "motion/react";
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

export function validBanner(
  value: ReturnType<typeof bannerSchema.parse>["banner"],
) {
  if (!value) return null;
  const image = safeDestination(value.image_url);
  if (!image || image.kind !== "external") return null;
  const url = new URL(value.image_url);
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
    (!destination ||
      (value.destination_type === "TELEGRAM" &&
        destination.kind !== "telegram") ||
      (value.destination_type === "HTTPS" && destination.kind !== "external"))
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
  if (!banner) return null;
  const key = `${banner.id}:${banner.version}`;
  if (failed === key) return null;
  return (
    <motion.aside
      key={key}
      className={styles.promoSlot}
      style={ready === key ? undefined : { display: "none" }}
      initial={{ opacity: 0, y: -7 }}
      animate={{ opacity: 1, y: 0 }}
      transition={mobileMotion.reveal}
      aria-label="Promotional banner placement"
    >
      <div className={styles.promoBanner}>
        {banner.destination ? (
          <a
            href={banner.destination}
            onClick={(event) => {
              event.preventDefault();
              navigateSafely(banner.destination, adapter, (to) => {
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
  );
}
