import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import notificationStyles from "./GameHeader.module.css";
import styles from "./TransientFeedback.module.css";

const useFeedback = create<{ item: { id: number; text: string; tone: "error" | "info" } | null }>(() => ({ item: null }));
let sequence = 0;
/** Transient presentation only; never stored in the Notification Center or used for rewards. */
export function showFeedback(text: string, tone: "error" | "info" = "error") {
  useFeedback.setState({ item: { id: ++sequence, text, tone } });
}
export function useQueryFeedback(error: unknown, text: string) {
  useEffect(() => { if (error) showFeedback(text); }, [error, text]);
}
export function TransientFeedback() {
  const item = useFeedback(state => state.item);
  useEffect(() => {
    if (!item) return;
    const timer = window.setTimeout(() => { if (useFeedback.getState().item?.id === item.id) useFeedback.setState({ item: null }); }, 6000);
    return () => window.clearTimeout(timer);
  }, [item]);
  useEffect(() => () => useFeedback.setState({ item: null }), []);
  return createPortal(<div className={styles.position}>
    <AnimatePresence>{item ? <motion.div key={item.id} className={`${notificationStyles.notificationItem} ${styles.feedback}`} role={item.tone === "error" ? "alert" : "status"}
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={mobileMotion.micro}>
      <span className={`${notificationStyles.notificationGlyph} ${notificationStyles.progress}`}><HugeiconsIcon icon={InformationCircleIcon} size={20} strokeWidth={1.8} /></span>
      <span className={notificationStyles.notificationCopy}><strong>{item.text}</strong></span>
    </motion.div> : null}</AnimatePresence>
  </div>, document.body);
}
