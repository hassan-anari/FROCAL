import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/design-system/primitives/Button";
import styles from "./AppErrorBoundary.module.css";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error("Dexo Land render failure", error, info);
    else console.error("Dexo Land render failure");
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className={styles.root}>
        <div className={styles.panel}>
          <span className={styles.eyebrow}>Recovery protocol</span>
          <h1>Dexo Land could not initialize.</h1>
          <p>Please close Dexo Land and open it again from Telegram.</p>
          <Button onClick={() => this.setState({ error: null })}>Try Again</Button>
        </div>
      </main>
    );
  }
}
