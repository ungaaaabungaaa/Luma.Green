"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: () => void;
}

/** Optional notification failures must never remove the surrounding application. */
export class NotificationErrorBoundary extends Component<
  Props,
  { failed: boolean }
> {
  static getDerivedStateFromError() {
    return { failed: true };
  }

  state = { failed: false };

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.failed
      ? (this.props.fallback ?? null)
      : this.props.children;
  }
}
