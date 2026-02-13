import React from 'react';

import { useEffect, useState } from 'react';
import { Alert, AlertTitle, CircularProgress, Box } from '@mui/material';
import { auth, db } from '../config/firebase';

export function FirebaseStatus() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const checkFirebase = async () => {
      try {
        // Verificar se as credenciais estão definidas
        const requiredEnvVars = [
          'VITE_FIREBASE_API_KEY',
          'VITE_FIREBASE_AUTH_DOMAIN',
          'VITE_FIREBASE_PROJECT_ID',
          'VITE_FIREBASE_STORAGE_BUCKET',
          'VITE_FIREBASE_MESSAGING_SENDER_ID',
          'VITE_FIREBASE_APP_ID'
        ];

        const missingVars = requiredEnvVars.filter(
          varName => !import.meta.env[varName]
        );

        if (missingVars.length > 0) {
          throw new Error(`Variáveis faltando: ${missingVars.join(', ')}`);
        }

        // Verificar se Auth e Firestore estão inicializados
        if (auth && db) {
          setStatus('success');
        } else {
          throw new Error('Serviços Firebase não inicializados');
        }
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error.message || 'Erro desconhecido');
      }
    };

    checkFirebase();
  }, []);

  if (status === 'checking') {
    return (
      <Box className="flex items-center gap-2">
        <CircularProgress size={20} />
        <span>Verificando conexão com Firebase...</span>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Alert severity="error" className="mt-4">
        <AlertTitle>Erro na configuração do Firebase</AlertTitle>
        {errorMessage}
      </Alert>
    );
  }

  return (
    <Alert severity="success" className="mt-4">
      <AlertTitle>Firebase conectado com sucesso! ✅</AlertTitle>
      Auth: {auth.app.name} | Firestore: {db.app.name}
    </Alert>
  );
}

