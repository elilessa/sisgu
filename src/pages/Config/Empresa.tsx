import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Alert,
    CircularProgress,
    Avatar,
    MenuItem,
} from '@mui/material';
import { Save, Upload, Delete, Image as ImageIcon } from '@mui/icons-material';
import { doc, getDoc, updateDoc, Timestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';

interface EmpresaData {
    nome: string;
    nomeFantasia: string;
    cnpj: string;
    inscricaoEstadual: string;
    logoUrl: string;
    cep: string;
    endereco: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    telefone1: string;
    telefone2: string;
    whatsapp: string;
    emailComercial: string;
    emailFinanceiro: string;
    emailTecnico: string;
    emailNoReply: string;
    site: string;
    atualizadoEm?: Timestamp;
}

const UF_OPTIONS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function EmpresaConfig() {
    const { userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<EmpresaData>({
        nome: '',
        nomeFantasia: '',
        cnpj: '',
        inscricaoEstadual: '',
        logoUrl: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        telefone1: '',
        telefone2: '',
        whatsapp: '',
        emailComercial: '',
        emailFinanceiro: '',
        emailTecnico: '',
        emailNoReply: '',
        site: '',
    });

    useEffect(() => {
        loadEmpresaData();
    }, [userData]);

    const loadEmpresaData = async () => {
        if (!userData?.empresaId) return;

        setLoading(true);
        try {
            const docRef = doc(db, 'EMPRESAS', userData.empresaId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setFormData({
                    nome: data.nome || '', // Nome da empresa (Razão Social)
                    nomeFantasia: data.nomeFantasia || '',
                    cnpj: data.cnpj || '',
                    inscricaoEstadual: data.inscricaoEstadual || '',
                    logoUrl: data.logoUrl || '',
                    cep: data.cep || '',
                    endereco: data.endereco || '',
                    numero: data.numero || '',
                    complemento: data.complemento || '',
                    bairro: data.bairro || '',
                    cidade: data.cidade || '',
                    uf: data.uf || '',
                    telefone1: data.telefone1 || '',
                    telefone2: data.telefone2 || '',
                    whatsapp: data.whatsapp || '',
                    emailComercial: data.emailComercial || '',
                    emailFinanceiro: data.emailFinanceiro || '',
                    emailTecnico: data.emailTecnico || '',
                    emailNoReply: data.emailNoReply || '',
                    site: data.site || '',
                });
            }
        } catch (err: any) {
            setError('Erro ao carregar dados da empresa: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAddressByCEP = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();

            if (!data.erro) {
                setFormData((prev) => ({
                    ...prev,
                    endereco: data.logradouro.toUpperCase(),
                    bairro: data.bairro.toUpperCase(),
                    cidade: data.localidade.toUpperCase(),
                    uf: data.uf,
                    complemento: data.complemento ? data.complemento.toUpperCase() : prev.complemento
                }));
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
        }
    };

    const handleInputChange = (field: keyof EmpresaData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));

        if (field === 'cep') {
            const cleanCep = value.replace(/\D/g, '');
            if (cleanCep.length === 8) {
                fetchAddressByCEP(cleanCep);
            }
        }
    };

    const formatCNPJ = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .slice(0, 18);
    };

    const formatTelefone = (value: string) => {
        const v = value.replace(/\D/g, '').slice(0, 11);
        if (v.length > 10) {
            return v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        return v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    };

    const formatCEP = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{5})(\d)/, '$1-$2')
            .slice(0, 9);
    };

    const handleUploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!userData?.empresaId || !event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];

        if (!file.type.startsWith('image/')) {
            setError('Por favor, selecione uma imagem válida.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setError('A imagem deve ter no máximo 2MB');
            return;
        }

        setUploading(true);
        try {
            const fileExtension = file.name.split('.').pop();
            const storageRef = ref(storage, `EMPRESAS/${userData.empresaId}/logo.${fileExtension}`);

            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            setFormData(prev => ({ ...prev, logoUrl: downloadURL }));
            setSuccess('Logo enviado com sucesso! Clique em Salvar para persistir.');
        } catch (err: any) {
            setError('Erro ao enviar logo: ' + err.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveLogo = async () => {
        setFormData(prev => ({ ...prev, logoUrl: '' }));
    };

    const handleSave = async () => {
        if (!userData?.empresaId) return;

        if (!formData.nome) {
            setError('O Nome da Empresa é obrigatório.');
            return;
        }

        try {
            const docRef = doc(db, 'EMPRESAS', userData.empresaId);

            await setDoc(docRef, {
                ...formData,
                atualizadoEm: Timestamp.now(),
            }, { merge: true });

            setSuccess('Dados da empresa salvos com sucesso!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError('Erro ao salvar dados: ' + err.message);
        }
    };

    if (loading) {
        return (
            <Box className="flex justify-center items-center h-screen">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <ProtectedRoute requiredRoute="/configuracoes/empresa">
            <Box className="p-6">
                <Typography variant="h4" className="font-bold mb-6">
                    Dados da Empresa
                </Typography>

                {error && (
                    <Alert severity="error" className="mb-4" onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" className="mb-4" onClose={() => setSuccess('')}>
                        {success}
                    </Alert>
                )}

                <Paper sx={{ p: 3 }}>
                    <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gap={2}>

                        {/* Logo Section */}
                        <Box gridColumn="span 12" className="mb-4">
                            <Typography variant="subtitle2" className="font-bold mb-2">
                                Logo
                            </Typography>
                            <Box className="flex gap-4 items-center">
                                <Avatar
                                    src={formData.logoUrl}
                                    variant="square"
                                    sx={{ width: 150, height: 150, bgcolor: '#f5f5f5', border: '1px solid #ddd' }}
                                >
                                    <ImageIcon sx={{ fontSize: 60, color: '#ccc' }} />
                                </Avatar>
                                <Box className="flex flex-col gap-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleUploadLogo}
                                        style={{ display: 'none' }}
                                    />
                                    <Button
                                        variant="outlined"
                                        startIcon={uploading ? <CircularProgress size={20} /> : <Upload />}
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        size="small"
                                    >
                                        {uploading ? 'Enviando...' : 'Carregar Logo'}
                                    </Button>
                                    {formData.logoUrl && (
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            startIcon={<Delete />}
                                            onClick={handleRemoveLogo}
                                            size="small"
                                        >
                                            Remover
                                        </Button>
                                    )}
                                    <Typography variant="caption" color="textSecondary">
                                        Máx. 2MB (PNG, JPG)
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>

                        {/* Basic Info */}
                        <Box gridColumn="span 12">
                            <Typography variant="h6" className="font-bold mb-2 text-gray-700">
                                Informações Principais
                            </Typography>
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 6" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Nome da Empresa (Razão Social) *"
                                value={formData.nome}
                                onChange={(e) => handleInputChange('nome', e.target.value.toUpperCase())}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 6" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Nome Fantasia"
                                value={formData.nomeFantasia}
                                onChange={(e) => handleInputChange('nomeFantasia', e.target.value.toUpperCase())}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 4" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="CNPJ"
                                value={formData.cnpj}
                                onChange={(e) => handleInputChange('cnpj', formatCNPJ(e.target.value))}
                                placeholder="00.000.000/0000-00"
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 4" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Inscrição Estadual"
                                value={formData.inscricaoEstadual}
                                onChange={(e) => handleInputChange('inscricaoEstadual', e.target.value)}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 4" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Website"
                                value={formData.site}
                                onChange={(e) => handleInputChange('site', e.target.value.toLowerCase())}
                                placeholder="www.suaempresa.com.br"
                            />
                        </Box>

                        {/* Address */}
                        <Box gridColumn="span 12" sx={{ mt: 2 }}>
                            <Typography variant="h6" className="font-bold mb-2 text-gray-700">
                                Endereço
                            </Typography>
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 2" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="CEP"
                                value={formData.cep}
                                onChange={(e) => handleInputChange('cep', formatCEP(e.target.value))}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 6" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Endereço (Rua/Av)"
                                value={formData.endereco}
                                onChange={(e) => handleInputChange('endereco', e.target.value.toUpperCase())}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 2" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Número"
                                value={formData.numero}
                                onChange={(e) => handleInputChange('numero', e.target.value)}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 2" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Complemento"
                                value={formData.complemento}
                                onChange={(e) => handleInputChange('complemento', e.target.value.toUpperCase())}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 4" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Bairro"
                                value={formData.bairro}
                                onChange={(e) => handleInputChange('bairro', e.target.value.toUpperCase())}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 6" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Cidade"
                                value={formData.cidade}
                                onChange={(e) => handleInputChange('cidade', e.target.value.toUpperCase())}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 2" }}>
                            <TextField
                                fullWidth
                                size="small"
                                select
                                label="UF"
                                value={formData.uf}
                                onChange={(e) => handleInputChange('uf', e.target.value)}
                            >
                                {UF_OPTIONS.map((uf) => (
                                    <MenuItem key={uf} value={uf}>{uf}</MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        {/* Contact */}
                        <Box gridColumn="span 12" sx={{ mt: 2 }}>
                            <Typography variant="h6" className="font-bold mb-2 text-gray-700">
                                Contato
                            </Typography>
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 4" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Telefone 1"
                                value={formData.telefone1}
                                onChange={(e) => handleInputChange('telefone1', formatTelefone(e.target.value))}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 4" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Telefone 2"
                                value={formData.telefone2}
                                onChange={(e) => handleInputChange('telefone2', formatTelefone(e.target.value))}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 4" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="WhatsApp"
                                value={formData.whatsapp}
                                onChange={(e) => handleInputChange('whatsapp', formatTelefone(e.target.value))}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 6" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="E-mail Comercial"
                                type="email"
                                value={formData.emailComercial}
                                onChange={(e) => handleInputChange('emailComercial', e.target.value.toLowerCase())}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 6" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="E-mail Financeiro"
                                type="email"
                                value={formData.emailFinanceiro}
                                onChange={(e) => handleInputChange('emailFinanceiro', e.target.value.toLowerCase())}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 6" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="E-mail Técnico"
                                type="email"
                                value={formData.emailTecnico}
                                onChange={(e) => handleInputChange('emailTecnico', e.target.value.toLowerCase())}
                            />
                        </Box>

                        <Box gridColumn={{ xs: "span 12", md: "span 6" }}>
                            <TextField
                                fullWidth
                                size="small"
                                label="E-mail No-Reply (Envio Automático)"
                                type="email"
                                value={formData.emailNoReply}
                                onChange={(e) => handleInputChange('emailNoReply', e.target.value.toLowerCase())}
                                helperText="Usado para notificações do sistema"
                            />
                        </Box>

                        <Box gridColumn="span 12" sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<Save />}
                                onClick={handleSave}
                                sx={{ minWidth: 200 }}
                            >
                                Salvar Dados
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </ProtectedRoute>
    );
}
