
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface UserData {
  id?: string;
  empresaId: string;
  nome: string;
  email: string;
  role: string;
  rotasPermitidas?: string[];
}

interface CreateCompanyData {
  nome: string;
  empresaId: string;
  adminEmail: string;
  adminPassword: string;
  adminNome: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string, empresaId: string) => Promise<void>;
  createCompany: (data: CreateCompanyData) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (rota: string) => boolean;
  updateUserPermissions: (userId: string, rotas: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Rotas disponíveis no sistema
export const ROTAS_DISPONIVEIS = [
  '/dashboard',
  '/clientes',
  '/clientes/lista',
  '/clientes/novo',
  '/agenda',
  '/agenda/visualizar',
  '/agenda/abertura-chamado',
  '/agenda/ordens-servico',
  '/agenda/area-tecnica',
  '/contratos',
  '/comercial',
  '/comercial/propostas',
  '/comercial/orcamentos',
  '/comercial/orcamentos-equipamentos',
  '/comercial/orcamentos-contratos',
  '/comercial/vendas',
  '/comercial/agenda-comercial',
  '/orcamentos',
  '/orcamentos-equipamentos',
  '/orcamentos-contratos',
  '/financeiro',
  '/financeiro/contas-receber',
  '/financeiro/contas-pagar',
  '/financeiro/fluxo-caixa',
  '/financeiro/boleto',
  '/financeiro/nota-fiscal',
  '/produtos',
  '/produtos/catalogo',
  '/produtos/lista',
  '/produtos/novo',
  '/produtos/compras',
  '/produtos/fornecedores',
  '/produtos/estoque',
  '/produtos/precificacao',
  '/relatorios',
  '/relatorios/financeiro',
  '/relatorios/clientes',
  '/relatorios/vendas',
  '/relatorios/tecnico',
  '/configuracoes',
  '/configuracoes/usuarios',
  '/usuarios',
  '/configuracoes/administradoras',
  '/configuracoes/administradoras/novo',
  '/configuracoes/administradoras/editar',
  '/configuracoes/administradoras/visualizar',
  '/configuracoes/administradoras/contatos',
  '/configuracoes/banco',
  '/configuracoes/banco/novo',
  '/configuracoes/banco/editar',
  '/configuracoes/banco/visualizar',
  '/configuracoes/parametros-produtos',
  '/configuracoes/parametros-comerciais',
  '/configuracoes/tipo-ordem',
  '/configuracoes/questionarios',
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          data.id = user.uid;
          
          // Se for admin, tem acesso a todas as rotas
          if (data.role === 'admin' && !data.rotasPermitidas) {
            data.rotasPermitidas = ROTAS_DISPONIVEIS;
          }
          
          setUserData(data);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, nome: string, empresaId: string) => {
    const empresaRef = doc(db, 'EMPRESAS', empresaId);
    const empresaDoc = await getDoc(empresaRef);
    
    if (!empresaDoc.exists()) {
      throw new Error('Empresa não encontrada. Verifique o ID da empresa.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Usuários novos só têm acesso ao dashboard por padrão
    await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
      nome,
      email,
      empresaId,
      role: 'usuario',
      rotasPermitidas: ['/dashboard'],
      createdAt: new Date().toISOString(),
    });
  };

  const createCompany = async (data: CreateCompanyData) => {
    const { nome, empresaId, adminEmail, adminPassword, adminNome } = data;
    
    const empresaRef = doc(db, 'EMPRESAS', empresaId);
    const empresaDoc = await getDoc(empresaRef);
    
    if (empresaDoc.exists()) {
      throw new Error('Este ID de empresa já está em uso. Escolha outro ID.');
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    
    await setDoc(doc(db, 'EMPRESAS', empresaId), {
      nome,
      empresaId,
      createdAt: new Date().toISOString(),
      status: 'ativa',
    });

    const documentosRef = collection(db, 'EMPRESAS', empresaId, 'documentos');
    await setDoc(doc(documentosRef, 'config'), {
      inicializado: true,
      createdAt: new Date().toISOString(),
    });
    
    // Admin tem acesso a todas as rotas
    await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
      nome: adminNome,
      email: adminEmail,
      empresaId,
      role: 'admin',
      rotasPermitidas: ROTAS_DISPONIVEIS,
      createdAt: new Date().toISOString(),
    });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const hasPermission = (rota: string): boolean => {
    if (!userData) return false;
    if (userData.role === 'admin') return true;
    return userData.rotasPermitidas?.includes(rota) || false;
  };

  const updateUserPermissions = async (userId: string, rotas: string[]) => {
    const userRef = doc(db, 'usuarios', userId);
    await updateDoc(userRef, {
      rotasPermitidas: rotas,
    });
  };

  const value = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    createCompany,
    signOut,
    hasPermission,
    updateUserPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
