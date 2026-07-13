/**
 * ErrorBoundary — top-level React error boundary.
 *
 * A render-time crash anywhere in <App/> would otherwise unmount the whole
 * tree and leave a blank white screen. This boundary catches it, reports the
 * error through the global telemetry module (so it lands in server logs via
 * /api/log), and shows a recoverable fallback instead of nothing.
 */
import React from 'react';
import { reportError } from '../utils/errorTelemetry.js';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Report the crash with component stack for server-side correlation.
    reportError(error, {
      boundary: this.props.name || 'root',
      componentStack: info?.componentStack,
    });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;
    return (
      <div
        role="alert"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
          background: 'var(--canvas-bg, #0A0A0A)',
          color: 'var(--text-primary, #F5F5F5)',
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'var(--color-accent, #D71921)',
            opacity: 0.9,
          }}
        />
        <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0, letterSpacing: '0.02em' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: '13px', opacity: 0.6, maxWidth: '420px', margin: 0, lineHeight: 1.5 }}>
          The canvas hit an unexpected error. Your data is safe on this device.
          Reload to continue, or the issue has been reported.
        </p>
        {error?.message && (
          <pre
            style={{
              fontSize: '11px',
              opacity: 0.4,
              maxWidth: '90vw',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              textAlign: 'left',
              margin: 0,
            }}
          >
            {error.message}
          </pre>
        )}
        <button
          onClick={this.handleReload}
          style={{
            height: '44px',
            minWidth: '140px',
            padding: '0 20px',
            borderRadius: '10px',
            border: '1px solid var(--color-border-focus, rgba(255,255,255,0.2))',
            background: 'var(--state-active, rgba(255,255,255,0.1))',
            color: 'inherit',
            fontSize: '13px',
            fontFamily: 'inherit',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          Reload Looking Glass
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
