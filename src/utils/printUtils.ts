import { customColors } from '../theme';
import html2pdf from 'html2pdf.js'; // Importa a lib para gerar PDF client-side

export const getBase64FromUrl = async (url: string): Promise<string> => {
  if (!url || !url.startsWith('http')) return url;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Erro convertendo imagem:', e);
    return ''; // Retorna vazio para não quebrar o html2pdf com erro de CORS
  }
};

export const gerarCabecalhoEmpresaHTML = async (empresaData: any) => {
  const info = empresaData || {};
  const logoUrl = info.logoUrl || '';
  const logoSrc = await getBase64FromUrl(logoUrl);

  return `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 0px;">
           <tr>
             ${logoSrc ? `<td style="width: 200px; vertical-align: middle;"><img src="${logoSrc}" style="max-width:180px; max-height:100px;" /></td>` : ''}
             <td style="padding-left: 20px; text-align: left; vertical-align: middle;">
                <div style="font-size: 16pt; font-weight: bold; margin-bottom: 5px;">${info.nome?.toUpperCase() || info.razaoSocial?.toUpperCase() || 'SUA EMPRESA'}</div>
                <div style="font-size: 10pt; line-height: 1.3; color: #555;">
                   ${info.nomeFantasia || ''}<br/>
                   ${info.cnpj ? `CNPJ: ${info.cnpj}` : ''}<br/>
                   ${info.site ? `${info.site} • ` : ''}${info.emailComercial || info.email || ''}
                </div>
             </td>
           </tr>
        </table>
        <hr style="border: 0; border-top: 2px solid #42D1D6; margin-top: 10px; margin-bottom: 0px;" />
  `;
};

interface DocumentoOptions {
  titulo: string;
  cabecalhoHTML: string;
  rodapeHTML: string;
  corpoHTML: string;
  estilosExtras?: string;
}

export const gerarLayoutDocumentoHTML = ({
  titulo,
  cabecalhoHTML,
  rodapeHTML,
  corpoHTML,
  estilosExtras = ''
}: DocumentoOptions) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${titulo}</title>
      <style>
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
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333; margin: 0; padding: 0; }
        
        /* Cabeçalho Fixo */
        .header-fixed {
          position: fixed; top: 0; left: 0; right: 0;
          background: white; z-index: 100;
          margin: 0; padding: 0;
          height: 110px; /* Reduzido para diminuir espaço acima do conteúdo */
          border-bottom: 2px solid #42D1D6; /* Linha de separação */
          overflow: hidden;
        }

        /* Rodapé Fixo */
        .footer-fixed {
           position: fixed; bottom: 0; left: 0; right: 0;
           height: 50px;
           border-top: 1px solid #ccc; 
           background: white; z-index: 100;
           padding-top: 10px;
           font-size: 8pt; 
           text-align: center; 
           color: #666; 
        }

        /* Tabela Wrapper para Espaçamento */
        .content-wrapper-table { width: 100%; border-collapse: collapse; border: 0; }
        .content-wrapper-table thead td { height: 115px; /* Ajustado para acompanhar redução do header */ }
        .content-wrapper-table tfoot td { height: 60px; /* Reserva espaço para footer */ }
        
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        td, th { word-wrap: break-word; overflow-wrap: break-word; }
        img { max-width: 150px; }

        /* Estilos utilitários */
        .user-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; page-break-inside: auto; }
        .user-table tr { page-break-inside: avoid; page-break-after: auto; }
        .user-table td, .user-table th { border: 1px solid #ddd; padding: 5px; vertical-align: top; }
        .user-table th { 
          background-color: #C1E3DB !important; 
          font-weight: bold; 
          text-align: left; 
          color: #333;
        }
        /* Garantir cores em tabelas antigas ou sem classe */
        thead tr { background-color: #C1E3DB !important; }
        thead th { background-color: #C1E3DB !important; }
        
        /* Remove espaçamento padrão de parágrafos para padronizar contratos */
        p { margin: 0; padding: 0; }
        
        /* Suporte para alinhamento do Editor (Quill) */
        .content-area .ql-align-center,
        .content-area p.ql-align-center { text-align: center !important; }
        .content-area .ql-align-right,
        .content-area p.ql-align-right { text-align: right !important; }
        .content-area .ql-align-justify,
        .content-area p.ql-align-justify { text-align: justify !important; }
        
        ${estilosExtras}
      </style>
    </head>
    <body>
        <div class="header-fixed">
          ${cabecalhoHTML}
        </div>

        <div class="footer-fixed">
          ${rodapeHTML}
        </div>

        <table class="content-wrapper-table">
          <thead><tr><td>&nbsp;</td></tr></thead>
          <tfoot><tr><td>&nbsp;</td></tr></tfoot>
          <tbody>
            <tr>
              <td>
                <div class="content-area">
                   ${corpoHTML}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
    </body>
    </html>
  `;
};

export const imprimirHTMLViaIframe = (htmlContent: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.opacity = '0.01';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 1500);
  }
};

/**
 * Gera um PDF Base64 a partir do HTML usando a biblioteca html2pdf.js.
 * @param htmlContent O conteúdo HTML completo (incluindo CSS)
 * @returns Promise<string> contendo o Base64 do PDF (ex: "data:application/pdf;base64,JVBERi0xLjQK...")
 */
export const gerarPDFBase64 = async (htmlContent: string): Promise<string> => {
  try {
    // 1. Cria um container temporário no DOM para renderizar o HTML
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.width = '210mm'; // Largura A4 padrão
    container.style.padding = '0'; // Sem padding extra para não cortar margens
    container.classList.add('html2pdf-container'); // Para debug se precisar
    document.body.appendChild(container);

    // 2. Configurações do html2pdf
    const opt = {
      margin: 10,
      filename: 'documento.pdf',
      image: { type: 'jpeg' as 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as 'portrait' }
    };

    // 3. Gera o PDF e captura como output Base64 (Data URI)
    const pdfBase64 = await html2pdf()
      .from(container)
      .set(opt)
      .outputPdf('datauristring'); // Retorna string Base64 completa

    // 4. Limpa o DOM
    document.body.removeChild(container);

    return pdfBase64;
  } catch (error) {
    console.error("Erro ao gerar PDF Base64 via html2pdf:", error);
    throw error;
  }
};
