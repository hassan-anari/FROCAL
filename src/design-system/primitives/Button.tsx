import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ tone = "primary", size = "md", leadingIcon, trailingIcon, className = "", children, ...props }, ref) => (
    <button ref={ref} className={`${styles.button} ${styles[tone]} ${styles[size]} ${className}`} {...props}>
      {leadingIcon ? <span className={styles.leadingIcon}>{leadingIcon}</span> : null}
      <span className={styles.label}>{children}</span>
      {trailingIcon ? <span className={styles.trailingIcon}>{trailingIcon}</span> : null}
    </button>
  ),
);

Button.displayName = "Button";
