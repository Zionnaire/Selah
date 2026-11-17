import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/**
 * If a screen fails to draw, say so and offer a way out, instead of leaving a blank page.
 * Work saved on the device is not touched by this: it only concerns what is on screen.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('A screen failed to draw', error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="boundary" role="alert">
        <h1>This screen could not be shown</h1>
        <p>Your work is saved on this device and has not been changed. Reloading usually fixes it.</p>
        <div className="boundary-actions">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
          <a className="btn" href="/">
            Go to the start
          </a>
        </div>
        <details>
          <summary>Details for support</summary>
          <pre>{error.message}</pre>
        </details>
      </div>
    );
  }
}
