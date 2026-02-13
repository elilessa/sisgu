import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import { Save, Preview } from '@mui/icons-material';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '../../contexts/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';

interface ModeloContrato {
  titulo: string;
  cabecalho: string;
  corpo: string;
  rodape: string;
}

interface ModeloOrcamento {
  titulo: string;
  cabecalho: string;
  corpo: string;
  rodape: string;
}

interface ModeloBoleto {
  titulo: string;
  cabecalho: string;
  corpo: string;
  rodape: string;
  instrucoes: string;
}

export function ModelosDocumentos() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);

  const [empresaLogo, setEmpresaLogo] = useState('');

  const [modeloContrato, setModeloContrato] = useState<ModeloContrato>({
    titulo: '', cabecalho: '', corpo: '', rodape: '',
  });

  const [modeloOrcamento, setModeloOrcamento] = useState<ModeloOrcamento>({
    titulo: '', cabecalho: '', corpo: '', rodape: '',
  });

  const [modeloBoleto, setModeloBoleto] = useState<ModeloBoleto>({
    titulo: '', cabecalho: '', corpo: '', rodape: '', instrucoes: '',
  });

  useEffect(() => {
    loadParametros();
  }, [userData]);

  const loadParametros = async () => {
    if (!userData?.empresaId) return;
    setLoading(true);
    try {
      // Carregar Logo
      const empresaRef = doc(db, 'EMPRESAS', userData.empresaId);
      const empresaSnap = await getDoc(empresaRef);
      if (empresaSnap.exists()) {
        setEmpresaLogo(empresaSnap.data().logoUrl || '');
      }

      // Contrato
      const contratoRef = doc(db, 'EMPRESAS', userData.empresaId, 'parametrosComerciais', 'modeloContrato');
      const contratoSnap = await getDoc(contratoRef);
      if (contratoSnap.exists()) {
        setModeloContrato(contratoSnap.data() as ModeloContrato);
      }

      // Orçamento
      const orcamentoRef = doc(db, 'EMPRESAS', userData.empresaId, 'parametrosComerciais', 'modeloOrcamento');
      const orcamentoSnap = await getDoc(orcamentoRef);
      if (orcamentoSnap.exists()) {
        setModeloOrcamento(orcamentoSnap.data() as ModeloOrcamento);
      }

      // Boleto
      const boletoRef = doc(db, 'EMPRESAS', userData.empresaId, 'parametrosComerciais', 'modeloBoleto');
      const boletoSnap = await getDoc(boletoRef);
      if (boletoSnap.exists()) {
        setModeloBoleto(boletoSnap.data() as ModeloBoleto);
      }
    } catch (err: any) {
      setError('Erro ao carregar (Tente recarregar a página): ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContrato = async () => {
    if (!userData?.empresaId) return;
    try {
      const contratoRef = doc(db, 'EMPRESAS', userData.empresaId, 'parametrosComerciais', 'modeloContrato');
      await setDoc(contratoRef, { ...modeloContrato, atualizadoEm: Timestamp.now() });
      setSuccess('Contrato salvo!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError('Erro ao salvar: ' + err.message); }
  };

  const handleSaveOrcamento = async () => {
    if (!userData?.empresaId) return;
    try {
      const orcamentoRef = doc(db, 'EMPRESAS', userData.empresaId, 'parametrosComerciais', 'modeloOrcamento');
      await setDoc(orcamentoRef, { ...modeloOrcamento, atualizadoEm: Timestamp.now() });
      setSuccess('Orçamento salvo!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError('Erro ao salvar: ' + err.message); }
  };

  const handleSaveBoleto = async () => {
    if (!userData?.empresaId) return;
    try {
      const boletoRef = doc(db, 'EMPRESAS', userData.empresaId, 'parametrosComerciais', 'modeloBoleto');
      await setDoc(boletoRef, { ...modeloBoleto, atualizadoEm: Timestamp.now() });
      setSuccess('Modelo de Boleto salvo!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { setError('Erro ao salvar: ' + err.message); }
  };

  // Suporte para alinhamento do Editor (Quill) - IMPORTANTE: sem !important
  const defaultBoletoHTML = `
<div style="font-family: Arial, sans-serif; font-size: 11px; width: 100%; max-width: 800px; margin: 0 auto; border: 1px dashed #ccc; padding: 20px;">
    <!-- Recibo do Sacado -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
            <td style="border-bottom: 2px dashed #000; padding: 5px; font-weight: bold; font-size: 14px;">RECIBO DO PAGADOR</td>
        </tr>
    </table>
    
    <table style="width: 100%; border: 1px solid #000; border-collapse: collapse;">
        <tr>
             <td style="border: 1px solid #000; padding: 2px;" width="20%"><div style="font-size:9px">Nosso Número</div><strong>{{BOLETO_NUMERO}}</strong></td>
             <td style="border: 1px solid #000; padding: 2px;" width="20%"><div style="font-size:9px">Vencimento</div><strong>{{VENCIMENTO}}</strong></td>
             <td style="border: 1px solid #000; padding: 2px;" width="60%"><div style="font-size:9px">Agência/Código Cedente</div><strong>{{AGENCIA_CODIGO}}</strong></td>
        </tr>
        <tr>
             <td style="border: 1px solid #000; padding: 2px;" colspan="3"><div style="font-size:9px">Pagador</div>{{NOME_CLIENTE}}</td>
        </tr>
    </table>
    <br/><br/>
    
    <!-- Cabeçalho do Boleto -->
    <table style="width: 100%; border-bottom: 2px solid #000; margin-bottom: 2px;">
        <tr>
            <td style="width: 50px; border-right: 2px solid #000; padding: 5px;"><img src="https://logodownload.org/wp-content/uploads/2014/05/banco-do-brasil-logo-0.png" style="width: 30px;" /></td>
            <td style="width: 60px; border-right: 2px solid #000; font-size: 20px; font-weight: bold; text-align: center; padding: 5px;">001-9</td>
            <td style="text-align: right; font-size: 14px; font-weight: bold; padding: 5px;">{{DIGITAVEL}}</td>
        </tr>
    </table>

    <!-- Campos do Boleto -->
    <table style="width: 100%; border: 1px solid #000; border-collapse: collapse;">
        <tr>
            <td colspan="5" style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Local de Pagamento</div>
                PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO
            </td>
            <td style="border: 1px solid #000; padding: 2px; width: 130px; background: #eee;">
                <div style="font-size: 9px;">Vencimento</div>
                <strong>{{VENCIMENTO}}</strong>
            </td>
        </tr>
        <tr>
            <td colspan="5" style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Beneficiário</div>
                SUA EMPRESA LTDA - CNPJ: 00.000.000/0001-00
            </td>
            <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Agência / Código Cedente</div>
                {{AGENCIA_CODIGO}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; padding: 2px; width: 80px;">
                <div style="font-size: 9px;">Data Documento</div>
                {{DATA_DOCUMENTO}}
            </td>
            <td style="border: 1px solid #000; padding: 2px; width: 80px;">
                <div style="font-size: 9px;">Nº do Documento</div>
                {{NOSSO_NUMERO}}
            </td>
            <td style="border: 1px solid #000; padding: 2px; width: 60px;">
                <div style="font-size: 9px;">Espécie Doc.</div>
                {{ESPECIE_DOC}}
            </td>
             <td style="border: 1px solid #000; padding: 2px; width: 40px;">
                <div style="font-size: 9px;">Aceite</div>
                {{ACEITE}}
            </td>
            <td style="border: 1px solid #000; padding: 2px; width: 80px;">
                <div style="font-size: 9px;">Data Processamento</div>
                {{DATA_DOCUMENTO}}
            </td>
            <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Nosso Número</div>
                {{BOLETO_NUMERO}}
            </td>
        </tr>
        <tr>
            <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Uso do Banco</div>
            </td>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Carteira</div>
                {{CARTEIRA}}
            </td>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Espécie</div>
                R$
            </td>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Quantidade</div>
            </td>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">Valor</div>
            </td>
             <td style="border: 1px solid #000; padding: 2px; background: #eee;">
                <div style="font-size: 9px;">(=) Valor do Documento</div>
                <strong>{{VALOR}}</strong>
            </td>
        </tr>
        <tr>
             <td colspan="5" rowspan="5" style="border: 1px solid #000; padding: 10px; vertical-align: top;">
                <div style="font-size: 9px; margin-bottom: 5px;">Instruções (Texto de responsabilidade do beneficiário)</div>
                {{INSTRUCOES}}
            </td>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">(-) Desconto / Abatimento</div>
            </td>
        </tr>
         <tr>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">(-) Outras Deduções</div>
            </td>
        </tr>
         <tr>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">(+) Mora / Multa</div>
            </td>
        </tr>
         <tr>
             <td style="border: 1px solid #000; padding: 2px;">
                <div style="font-size: 9px;">(+) Outros Acréscimos</div>
            </td>
        </tr>
         <tr>
             <td style="border: 1px solid #000; padding: 2px; background: #eee;">
                <div style="font-size: 9px;">(=) Valor Cobrado</div>
            </td>
        </tr>
         <tr>
             <td colspan="6" style="border: 1px solid #000; padding: 5px;">
                <div style="font-size: 9px;">Pagador</div>
                {{NOME_CLIENTE}} - {{CNPJ_CPF}}<br/>
                {{ENDERECO_COMPLETO}}<br/>
            </td>
        </tr>
    </table>
    <div style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px;">
        <div style="font-size: 9px; text-align: right;">Autenticação Mecânica</div>
        <br/>
        <!-- Código de Barras Falso (apenas visual) -->
        <div style="height: 50px; background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 5px, #fff 5px, #fff 8px); width: 350px;"></div>
    </div>
</div>
      `;

  const handlePreviewPDF = async (tipo: 'contrato' | 'orcamento' | 'boleto') => {
    if (!userData?.empresaId) return;

    try {
      // Busca dados frescos da empresa para o preview
      const empresaRef = doc(db, 'EMPRESAS', userData.empresaId);
      const empresaSnap = await getDoc(empresaRef);
      const empresaData = empresaSnap.exists() ? empresaSnap.data() : {};

      const logoUrl = empresaLogo || empresaData.logoUrl || '';

      // Dados Fakes
      const dadosFake = {
        nomeCliente: 'CLIENTE EXEMPLO LTDA',
        cnpjCpf: '00.123.456/0001-90',
        enderecoCompleto: 'AV. BRASIL, 1500 - CENTRO - SÃO PAULO/SP - CEP: 01000-000',
        valorTotal: 'R$ 1.500,00',
        status: 'EM ABERTO',
        dataInicio: new Date().toLocaleDateString('pt-BR'),
        contatoNome: 'João Silva',
        contatoFuncao: 'Gerente Administrativo',
        contatoTelefone: '(11) 3333-4444',
        contatoWhatsapp: '(11) 98888-7777',
        contatoApto: 'Sala 304',
        contatoEmail: 'joao.principal@cliente.com',
        contatoEmail2: 'financeiro@cliente.com',
        prefixo: 'PRE',
        // Dados Boleto
        boletoNumero: '00012345',
        digitavel: '00190.00009 01234.567891 00000.000000 1 00000000015000',
        vencimento: new Date(new Date().getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
        agenciaCodigo: '1234 / 56789-0',
        nossoNumero: '123456789',
        carteira: '17',
        dataDocumento: new Date().toLocaleDateString('pt-BR'),
        especieDoc: 'DM',
        aceite: 'N',
        instrucoes: 'Sr. Caixa, não receber após o vencimento.<br/>Multa de 2% após vencimento.',
      };

      // ... (Tabelas Fakes)
      const tabelaCobertos = `
        <table style="width:100%; border-collapse: collapse; margin: 10px 0;">
          <thead>
            <tr style="background-color: #f0f0f0;"><th>Qtd</th><th>Equipamento</th><th>Marca/Modelo</th></tr>
          </thead>
          <tbody>
            <tr><td>04</td><td>Câmera IP</td><td>Intelbras VIP 1230</td></tr>
            <tr><td>01</td><td>DVR 16 Canais</td><td>Hikvision</td></tr>
          </tbody>
        </table>`;

      const tabelaNaoCobertos = `
        <table style="width:100%; border-collapse: collapse; margin: 10px 0;">
          <thead>
            <tr style="background-color: #f0f0f0;"><th>Qtd</th><th>Equipamento</th><th>Motivo</th></tr>
          </thead>
          <tbody>
            <tr><td>02</td><td>Monitor Antigo</td><td>Fora de linha</td></tr>
          </tbody>
        </table>`;

      let modelo: any = modeloContrato;
      if (tipo === 'orcamento') modelo = modeloOrcamento;
      if (tipo === 'boleto') modelo = modeloBoleto;

      // Se for boleto e estiver vazio, usa o template padrão
      if (tipo === 'boleto' && !modelo.corpo) {
        modelo = { ...modelo, corpo: defaultBoletoHTML };
      }

      let corpoHTML = modelo.corpo
        .replace(/\{\{NOME_CLIENTE\}\}/g, dadosFake.nomeCliente)
        .replace(/\{\{CNPJ_CPF\}\}/g, dadosFake.cnpjCpf)
        .replace(/\{\{ENDERECO_COMPLETO\}\}/g, dadosFake.enderecoCompleto)
        .replace(/\{\{VALOR_TOTAL\}\}/g, dadosFake.valorTotal)
        .replace(/\{\{TABELA_EQUIPAMENTOS_COBERTOS\}\}/g, tabelaCobertos)
        .replace(/\{\{TABELA_EQUIPAMENTOS_NAO_COBERTOS\}\}/g, tabelaNaoCobertos)
        .replace(/\{\{DATA_INICIO\}\}/g, dadosFake.dataInicio)
        .replace(/\{\{CONTATO_NOME\}\}/g, dadosFake.contatoNome)
        .replace(/\{\{CONTATO_FUNCAO\}\}/g, dadosFake.contatoFuncao)
        .replace(/\{\{CONTATO_TELEFONE\}\}/g, dadosFake.contatoTelefone)
        .replace(/\{\{CONTATO_WHATSAPP\}\}/g, dadosFake.contatoWhatsapp)
        .replace(/\{\{CONTATO_APTO\}\}/g, dadosFake.contatoApto)
        .replace(/\{\{CONTATO_EMAIL\}\}/g, dadosFake.contatoEmail)
        .replace(/\{\{CONTATO_EMAIL1\}\}/g, dadosFake.contatoEmail)
        .replace(/\{\{CONTATO_EMAIL2\}\}/g, dadosFake.contatoEmail2)
        .replace(/\{\{CLIENTE_PREFIXO\}\}/g, dadosFake.prefixo)
        // Boleto Replacements
        .replace(/\{\{BOLETO_NUMERO\}\}/g, dadosFake.boletoNumero)
        .replace(/\{\{DIGITAVEL\}\}/g, dadosFake.digitavel)
        .replace(/\{\{VENCIMENTO\}\}/g, dadosFake.vencimento)
        .replace(/\{\{VALOR\}\}/g, dadosFake.valorTotal)
        .replace(/\{\{AGENCIA_CODIGO\}\}/g, dadosFake.agenciaCodigo)
        .replace(/\{\{NOSSO_NUMERO\}\}/g, dadosFake.nossoNumero)
        .replace(/\{\{CARTEIRA\}\}/g, dadosFake.carteira)
        .replace(/\{\{DATA_DOCUMENTO\}\}/g, dadosFake.dataDocumento)
        .replace(/\{\{ESPECIE_DOC\}\}/g, dadosFake.especieDoc)
        .replace(/\{\{ACEITE\}\}/g, dadosFake.aceite)
        .replace(/\{\{INSTRUCOES\}\}/g, dadosFake.instrucoes);

      // 2. TEMPLATE HTML FINAL: Header/Footer absolutos + Padding no conteúdo
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Impressão</title>
          <style>
             /* Margens finas na folha para aproveitar espaço */
             @page { 
               margin: 10mm; 
               size: A4;
               /* Remove cabeçalho e rodapé do navegador */
               @top-left { content: none; }
               @top-center { content: none; }
               @top-right { content: none; }
               @bottom-left { content: none; }
               @bottom-center { content: none; }
               @bottom-right { content: none; }
             }
             
             body { 
               font-family: Arial, sans-serif; 
               font-size: 11pt; 
               color: #000; 
               margin: 0; 
               padding: 0;
             }

             /* 
                CABEÇALHO FIXO NO TOPO
                Altura reservada: ~100px 
             */
             .header-fixed {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 100px; /* Reduzido para diminuir espaço acima do conteúdo */
                border-bottom: 2px solid #000;
                background: white;
                z-index: 100;
                display: flex;
                align-items: center;
             }
             
             /* 
                RODAPÉ FIXO NO FUNDO
                Altura reservada: ~50px
             */
             .footer-fixed {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 50px; /* Altura fixa */
                border-top: 1px solid #ccc;
                text-align: center;
                font-size: 9pt;
                background: white;
                z-index: 100;
                padding-top: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
             }

             /* Layout Interno do Header */
             .header-table { width: 100%; border-collapse: collapse; }
             .logo-cell { width: 200px; vertical-align: middle; }
             .info-cell { padding-left: 20px; text-align: left; vertical-align: top; padding-top: 5px; }
             .empresa-nome { font-size: 16pt; font-weight: bold; }
             .empresa-dados { font-size: 11pt; line-height: 1.3; }

             /* 
                TABELA DE LAYOUT PARA O CONTEÚDO 
                Usa thead/tfoot invisíveis para garantir espaço nas quebras de página
             */
             .content-wrapper-table { width: 100%; border-collapse: collapse; }
             .spacer-header { height: 105px; } /* Ajustado para acompanhar redução do header */
             .spacer-footer { height: 60px; }  /* Espaço para o rodapé fixo + folga */

             .content-area { line-height: 1.25; }
             .content-area p { margin: 0; padding: 0; }
             .content-area ul, .content-area ol { margin-top: 0; margin-bottom: 0; }
             
             /* Suporte para alinhamento do Editor (Quill) - IMPORTANTE: sem !important */
             .content-area .ql-align-center,
             .content-area p.ql-align-center { text-align: center !important; }
             .content-area .ql-align-right,
             .content-area p.ql-align-right { text-align: right !important; }
             .content-area .ql-align-justify,
             .content-area p.ql-align-justify { text-align: justify !important; }

             .user-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
             .user-table th, .user-table td { border: 1px solid #999; padding: 5px; }

             @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
           <!-- Elementos Fixos Visuais -->
           <div class="header-fixed">
             <table class="header-table">
               <tr>
                 ${logoUrl ? `<td class="logo-cell"><img src="${logoUrl}" style="max-width:200px; max-height:110px;" /></td>` : ''}
                 <td class="info-cell">
                    <div class="empresa-nome">${empresaData.nome?.toUpperCase() || empresaData.razaoSocial?.toUpperCase() || 'SUA EMPRESA'}</div>
                    <div class="empresa-dados">
                       ${empresaData.nomeFantasia || ''}<br/>
                       ${empresaData.cnpj ? `CNPJ: ${empresaData.cnpj}` : ''}<br/>
                       ${empresaData.site ? `${empresaData.site} • ` : ''}${empresaData.emailComercial || ''}
                    </div>
                 </td>
               </tr>
             </table>
           </div>

           <div class="footer-fixed">
              ${modelo.rodape || ''}
           </div>

           <!-- 
              Tabela Principal que 'empurra' o texto para não ficar baixo dos fixos.
              thead e tfoot vazios criam o espaço seguro em TODAS as páginas.
           -->
           <table class="content-wrapper-table">
             <thead><tr><td><div class="spacer-header">&nbsp;</div></td></tr></thead>
             <tfoot><tr><td><div class="spacer-footer">&nbsp;</div></td></tr></tfoot>
             <tbody>
               <tr>
                 <td>
                   <div class="content-area">
                      ${corpoHTML.replace(/<table/g, '<table class="user-table"')} 
                   </div>
                 </td>
               </tr>
             </tbody>
           </table>
        </body>
        </html>
      `;

      // 3. EXECUÇÃO: Cria iframe e imprime
      const iframe = document.createElement('iframe');
      Object.assign(iframe.style, {
        position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0'
      });
      document.body.appendChild(iframe);

      const previewDoc = iframe.contentWindow?.document;

      if (previewDoc) {
        // Define o handler ANTES de escrever
        iframe.onload = () => {
          // Função segura para imprimir e limpar
          const doPrint = () => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (e) { console.error(e); }
            // Remove após uso (timeout longo para garantir que dialog abriu)
            setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 5000);
          };

          // Verifica imagens carregadas
          const imgs = previewDoc.querySelectorAll('img');
          if (imgs.length === 0) {
            setTimeout(doPrint, 500);
          } else {
            let loadedParams = 0;
            const check = () => {
              loadedParams++;
              if (loadedParams >= imgs.length) setTimeout(doPrint, 500);
            };
            imgs.forEach(img => {
              if (img.complete) check();
              else { img.onload = check; img.onerror = check; }
            });
          }
        };

        // Escreve o conteúdo (isso dispara o onload assim que terminar o parse inicial)
        previewDoc.open();
        previewDoc.write(htmlContent);
        previewDoc.close();
      }

    } catch (e: any) {
      setError('Erro ao gerar visualização: ' + e.message);
    }
  };

  if (loading) return <Box p={4}><CircularProgress /></Box>;

  return (
    <ProtectedRoute requiredRoute="/configuracoes/parametros-comerciais">
      <Box className="p-6">
        <Typography variant="h4" className="font-bold mb-6">Modelos de Documentos</Typography>

        {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}

        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
          <Tab label="Contrato" />
          <Tab label="Orçamento" />
          <Tab label="Boleto" />
        </Tabs>

        {/* --- CONTEÚDO DA ABA --- */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" className="mb-4">
            {tabValue === 0 ? 'Modelo de Contrato' : tabValue === 1 ? 'Modelo de Orçamento' : 'Modelo de Boleto (Instruções e Layout)'}
          </Typography>

          <Box mb={2}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Cabeçalho Automático:</strong> O logo e dados da empresa serão inseridos automaticamente no topo do documento.
            </Alert>

            {/* Visualização de Confirmação do Logo */}
            <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 3, bgcolor: '#f9f9f9' }}>
              {empresaLogo ? (
                <>
                  <img src={empresaLogo} alt="Logo" style={{ maxHeight: 60, maxWidth: 150, objectFit: 'contain' }} />
                  <Typography variant="body2" color="textSecondary">
                    Logo carregado. Será exibido no topo do documento.
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="error">
                  Sem logo identificado. O cabeçalho terá apenas o nome da empresa.
                </Typography>
              )}
            </Box>
          </Box>

          {/* Lista de Placeholders (Cópia da original) */}
          <Box sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, border: '1px solid #ddd' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Variáveis Disponíveis para Balão Automático:</Typography>

            <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={2} sx={{ fontSize: '0.85rem' }}>
              <Box>
                <strong>Cliente:</strong><br />
                <code>{'{{NOME_CLIENTE}}'}</code> - Nome/Razão Social<br />
                <code>{'{{CNPJ_CPF}}'}</code> - Documento<br />
                <code>{'{{CLIENTE_PREFIXO}}'}</code> - Prefixo<br />
                <code>{'{{ENDERECO_COMPLETO}}'}</code> - Endereço completo<br />
                <br />
                <strong>Contato:</strong><br />
                <code>{'{{CONTATO_NOME}}'}</code> - Nome<br />
                <code>{'{{CONTATO_FUNCAO}}'}</code> - Função<br />
                <code>{'{{CONTATO_TELEFONE}}'}</code> - Telefone<br />
                <code>{'{{CONTATO_WHATSAPP}}'}</code> - Whatsapp<br />
                <code>{'{{CONTATO_APTO}}'}</code> - Apto/Sala<br />
                <code>{'{{CONTATO_EMAIL1}}'}</code> - Email Principal<br />
                <code>{'{{CONTATO_EMAIL2}}'}</code> - Email Secundário<br />
                <code>{'{{CLIENTE_CONTATO}}'}</code> - Bloco Completo (HTML)
              </Box>

              {tabValue === 0 ? (
                <Box>
                  <strong>Contrato:</strong><br />
                  <code>{'{{TITULO_CONTRATO}}'}</code> - Título do Contrato<br />
                  <code>{'{{TIPO_CONTRATO}}'}</code> - Tipo de serviço<br />
                  <code>{'{{DATA_INICIO}}'}</code> - Início do contrato<br />
                  <code>{'{{VALOR_MENSAL}}'}</code> - Valor mensal (R$)<br />
                  <code>{'{{VALOR_MENSAL_EXTENSO}}'}</code> - Valor por extenso<br />
                  <code>{'{{TABELA_EQUIPAMENTOS_COBERTOS}}'}</code> - Equipamentos Cobertos<br />
                  <code>{'{{TABELA_EQUIPAMENTOS_NAO_COBERTOS}}'}</code> - Equipamentos Não Cobertos
                </Box>
              ) : (
                <Box>
                  <strong>Orçamento:</strong><br />
                  <code>{'{{NUMERO_ORCAMENTO}}'}</code> - Nº Orçamento<br />
                  <code>{'{{TITULO_ORCAMENTO}}'}</code> - Título<br />
                  <code>{'{{DATA_EMISSAO}}'}</code> - Emissão<br />
                  <code>{'{{DATA_VALIDADE}}'}</code> - Validade<br />
                  <code>{'{{STATUS}}'}</code> - Status<br />
                  <code>{'{{VENDEDOR_NOME}}'}</code> - Vendedor<br />
                  <code>{'{{OBSERVACAO}}'}</code> - Observações<br />
                  <code>{'{{ITENS_ORCAMENTO}}'}</code> - Itens/Produtos<br />
                  <br />
                  <strong>Financeiro:</strong><br />
                  <code>{'{{VALOR_TOTAL}}'}</code> - Total (R$)<br />
                  <code>{'{{VALOR_EXTENSO}}'}</code> - Total (Extenso)<br />
                  <code>{'{{CONDICOES_PAGAMENTO}}'}</code> - Condições de Pagto (Bloco formatado)
                  <code>{'{{CONDICOES_PAGAMENTO}}'}</code> - Condições de Pagto (Bloco formatado)
                </Box>
              )}

              {tabValue === 2 && (
                <Box>
                  <strong>Boleto Bancário:</strong><br />
                  <code>{'{{BOLETO_NUMERO}}'}</code> - Nosso Número<br />
                  <code>{'{{DIGITAVEL}}'}</code> - Linha Digitável<br />
                  <code>{'{{CODIGO_BARRAS}}'}</code> - Código de Barras (Imagem)<br />
                  <code>{'{{VENCIMENTO}}'}</code> - Data de Vencimento<br />
                  <code>{'{{VALOR}}'}</code> - Valor do Documento<br />
                  <code>{'{{AGENCIA_CODIGO}}'}</code> - Agência / Código Cedente<br />
                  <code>{'{{NOSSO_NUMERO}}'}</code> - Nosso Número (Formatado)<br />
                  <code>{'{{CARTEIRA}}'}</code> - Carteira<br />
                  <code>{'{{DATA_DOCUMENTO}}'}</code> - Data do Documento<br />
                  <code>{'{{ESPECIE_DOC}}'}</code> - Espécie (DM, DS, etc)<br />
                  <code>{'{{ACEITE}}'}</code> - Aceite (S/N)<br />
                  <code>{'{{INSTRUCOES}}'}</code> - Instruções de Pagamento<br />
                </Box>
              )}
            </Box>
            <Typography variant="caption" color="textSecondary" display="block" mt={1}>
              Copie e cole esses códigos no texto abaixo. O sistema irá substituí-los pelos dados reais.
            </Typography>
          </Box>

          <Typography className="font-bold mb-1">Corpo do Documento</Typography>
          <div style={{ height: '400px', marginBottom: '60px' }}>
            <ReactQuill
              theme="snow"
              value={tabValue === 0 ? modeloContrato.corpo : tabValue === 1 ? modeloOrcamento.corpo : modeloBoleto.corpo}
              onChange={(val) => {
                if (tabValue === 0) setModeloContrato(p => ({ ...p, corpo: val }));
                else if (tabValue === 1) setModeloOrcamento(p => ({ ...p, corpo: val }));
                else setModeloBoleto(p => ({ ...p, corpo: val }));
              }}
              style={{ height: '100%' }}
              modules={{
                toolbar: [
                  [{ 'header': [1, 2, 3, false] }],
                  [{ 'size': ['small', false, 'large', 'huge'] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'color': [] }, { 'background': [] }],
                  [{ 'align': [] }],
                  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                  ['link', 'image'],
                  ['clean']
                ]
              }}
            />
          </div>

          <Typography className="font-bold mb-1 mt-4">Rodapé</Typography>
          <div style={{ height: '120px', marginBottom: '50px' }}>
            <ReactQuill
              theme="snow"
              value={tabValue === 0 ? modeloContrato.rodape : tabValue === 1 ? modeloOrcamento.rodape : modeloBoleto.rodape}
              onChange={(val) => {
                if (tabValue === 0) setModeloContrato(p => ({ ...p, rodape: val }));
                else if (tabValue === 1) setModeloOrcamento(p => ({ ...p, rodape: val }));
                else setModeloBoleto(p => ({ ...p, rodape: val }));
              }}
              style={{ height: '100%' }}
              modules={{
                toolbar: [
                  [{ 'header': [1, 2, 3, false] }],
                  [{ 'size': ['small', false, 'large', 'huge'] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'color': [] }, { 'background': [] }],
                  [{ 'align': [] }],
                  ['clean']
                ]
              }}
            />
          </div>

          <Box display="flex" gap={2} mt={2}>
            <Button variant="contained" startIcon={<Save />} onClick={tabValue === 0 ? handleSaveContrato : tabValue === 1 ? handleSaveOrcamento : handleSaveBoleto}>
              Salvar
            </Button>
            <Button variant="outlined" startIcon={<Preview />} onClick={() => handlePreviewPDF(tabValue === 0 ? 'contrato' : tabValue === 1 ? 'orcamento' : 'boleto' as any)}>
              Visualizar e Imprimir
            </Button>
          </Box>
        </Paper>

      </Box>
    </ProtectedRoute>
  );
}
