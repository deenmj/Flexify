import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Typography } from 'antd';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // Auto-reload on dynamic import failure (usually means a new version was deployed)
    const isChunkLoadError = error?.message?.includes('Failed to fetch dynamically imported module') || 
                             error?.message?.includes('Importing a module script failed');
                             
    if (isChunkLoadError) {
      const reloadCount = sessionStorage.getItem('chunk_reload');
      if (!reloadCount) {
        sessionStorage.setItem('chunk_reload', 'true');
        window.location.reload();
      } else {
        // Clear it so it works again next time they use the app
        sessionStorage.removeItem('chunk_reload');
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '24px', textAlign: 'center' }}>
          <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '24px' }} />
          <Typography.Title level={2}>Something went wrong</Typography.Title>
          <Typography.Text type="secondary" style={{ marginBottom: '24px', maxWidth: '600px' }}>
            {this.state.errorMessage || 'An unexpected error occurred. Our team has been notified. Please try refreshing the page or navigating back home.'}
          </Typography.Text>
          <Button type="primary" size="large" onClick={() => window.location.href = '/'}>
            Return to Home
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
