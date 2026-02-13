import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Tabs,
  Tab,
  Container,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export function Login() {
  const [tabValue, setTabValue] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const { signIn, signUp, createCompany } = useAuth();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signUp(email, password, nome, empresaId);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await createCompany({
        nome: companyName,
        empresaId: companyId,
        adminEmail,
        adminPassword,
        adminNome: adminName,
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao criar empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <Container maxWidth="sm">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <Typography variant="h5" className="text-center mb-4 font-bold text-primary-700">
              Sistema de Gestão
            </Typography>

          {error && (
            <Alert severity="error" className="mb-3">
              {error}
            </Alert>
          )}

          <Tabs value={tabValue} onChange={handleTabChange} className="mb-4">
            <Tab label="Login" />
            <Tab label="Cadastro" />
            <Tab label="Nova Empresa" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mb-3"
                required
              />
              <TextField
                fullWidth
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mb-4"
                required
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <form onSubmit={handleSignUp}>
              <TextField
                fullWidth
                label="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mb-3"
                required
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mb-3"
                required
              />
              <TextField
                fullWidth
                label="Senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mb-3"
                required
              />
              <TextField
                fullWidth
                label="ID da Empresa"
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="mb-4"
                required
                helperText="Solicite o ID da empresa ao administrador"
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <form onSubmit={handleCreateCompany}>
              <Typography variant="subtitle2" className="mb-2 text-gray-600">
                Informações da Empresa
              </Typography>
              <TextField
                fullWidth
                label="Nome da Empresa"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mb-3"
                required
              />
              <TextField
                fullWidth
                label="ID da Empresa"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="mb-4"
                required
                helperText="Use apenas letras, números e hífens (ex: minha-empresa)"
              />

              <Typography variant="subtitle2" className="mb-2 mt-4 text-gray-600">
                Dados do Administrador
              </Typography>
              <TextField
                fullWidth
                label="Nome do Administrador"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="mb-3"
                required
              />
              <TextField
                fullWidth
                label="Email do Administrador"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="mb-3"
                required
              />
              <TextField
                fullWidth
                label="Senha do Administrador"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="mb-4"
                required
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {loading ? 'Criando empresa...' : 'Criar Empresa'}
              </Button>
            </form>
          </TabPanel>
        </CardContent>
      </Card>
      </Container>
    </Box>
  );
}