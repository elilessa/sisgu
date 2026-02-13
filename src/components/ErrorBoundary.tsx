import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100vh',
                        p: 3,
                        textAlign: 'center',
                        bgcolor: '#f5f5f5'
                    }}
                >
                    <Typography variant="h4" color="error" gutterBottom>
                        Ops! Algo deu errado.
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                        Ocorreu um erro inesperado na aplicação. Tente recarregar a página.
                    </Typography>
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#fff', borderRadius: 1, boxShadow: 1, maxWidth: '80%', overflow: 'auto' }}>
                        <code style={{ color: '#d32f2f' }}>
                            {this.state.error?.message}
                        </code>
                    </Box>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={this.handleReload}
                        sx={{ mt: 3 }}
                    >
                        Recarregar Página
                    </Button>
                </Box>
            );
        }

        return this.props.children;
    }
}
