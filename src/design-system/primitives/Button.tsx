import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  leadingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ tone = "primary", size = "md", leadingIcon, className = "", children, ...props }, ref) => (
    <button ref={ref} className={`${styles.button} ${styles[tone]} ${styles[size]} ${className}`} {...props}>
      {leadingIcon ? <span className={styles.icon}>{leadingIcon}</span> : null}
      <span>{children}</span>
    </button>
  ),
);

Button.displayName = "Button";
