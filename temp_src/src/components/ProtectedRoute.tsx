
import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, Button } from '@mui/material';
import { Lock } from '@mui/icons-material';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoute: string;
}

export function ProtectedRoute({ children, requiredRoute }: ProtectedRouteProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(requiredRoute)) {
    return (
      <Box className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Lock className="text-gray-400 mb-4" style={{ fontSize: 80 }} />
        <Typography variant="h5" className="mb-2 text-gray-700">
          Acesso Negado
        </Typography>
        <Typography variant="body1" className="text-gray-500 mb-4 text-center">
          Você não tem permissão para acessar esta área.
          <br />
          Entre em contato com o administrador do sistema.
        </Typography>
        <Button variant="outlined" href="/dashboard">
          Voltar ao Dashboard
        </Button>
      </Box>
    );
  }

  return <>{children}</>;
}
