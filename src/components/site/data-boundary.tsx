"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  /** What to show instead; `retry` renders the children again. */
  fallback: (retry: () => void) => ReactNode;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Catches a live query that throws, so one broken panel — the price card on
 * the home page, say — never blanks the whole page. React only offers this
 * as a class component.
 */
export class DataBoundary extends Component<Props, State> {
  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override state: State = { failed: false };

  retry = () => {
    this.setState({ failed: false });
  };

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  override render() {
    return this.state.failed
      ? this.props.fallback(this.retry)
      : this.props.children;
  }
}
