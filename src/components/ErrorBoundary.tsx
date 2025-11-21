import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #1a1a2e;
  color: #fff;
  padding: 20px;
  text-align: center;
`;

const ErrorTitle = styled.h1`
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #ef4444;
`;

const ErrorMessage = styled.p`
  font-size: 1.1rem;
  margin-bottom: 2rem;
  color: #cbd5e1;
  max-width: 600px;
`;

const ErrorButton = styled.button`
  padding: 12px 24px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #4f46e5;
  }
`;

const ErrorDetails = styled.details`
  margin-top: 2rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  max-width: 800px;
  text-align: left;
  
  summary {
    cursor: pointer;
    font-weight: 600;
    margin-bottom: 1rem;
  }
  
  pre {
    overflow-x: auto;
    font-size: 0.875rem;
    color: #fca5a5;
  }
`;

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorContainer>
                    <ErrorTitle>Oops! Something went wrong</ErrorTitle>
                    <ErrorMessage>
                        We encountered an unexpected error. This might be due to a temporary issue.
                        Please try reloading the page or going back to the home page.
                    </ErrorMessage>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <ErrorButton onClick={this.handleReload}>
                            Reload Page
                        </ErrorButton>
                        <ErrorButton onClick={this.handleGoHome}>
                            Go to Home
                        </ErrorButton>
                    </div>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <ErrorDetails>
                            <summary>Error Details (Development Only)</summary>
                            <pre>
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </ErrorDetails>
                    )}
                </ErrorContainer>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
