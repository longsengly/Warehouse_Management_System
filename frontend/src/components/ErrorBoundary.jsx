import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
          <h2>Something went wrong.</h2>
          {this.state.error && <p>{this.state.error.toString()}</p>}
          {this.state.errorInfo && <pre>{this.state.errorInfo.componentStack}</pre>}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
