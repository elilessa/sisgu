const nodemailer = require('nodemailer');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Aumentado para suportar PDFs em Base64

// Configuração do Transporter (SMTP)
// Substitua pelas variáveis de ambiente no Replit
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.locaweb.com.br',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // true para 465, false para outras portas
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Endpoint de Teste
app.get('/', (req, res) => {
    res.send('Serviço de E-mail SisGu Ativo 🚀');
});

// Endpoint de Envio de Orçamento
app.post('/api/send-orcamento', async (req, res) => {
    const {
        to,
        subject,
        clienteNome,
        numeroOrcamento,
        valorTotal,
        pdfBase64,
        linkAprovacao // Opcional: Link para aprovar direto
    } = req.body;

    if (!to || !pdfBase64) {
        return res.status(400).json({ success: false, message: 'Faltando destinatário ou PDF.' });
    }

    // Template HTML Profissional
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background-color: #00695c; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">Orçamento #${numeroOrcamento}</h2>
        </div>
        
        <div style="padding: 30px;">
            <p>Olá, <strong>${clienteNome}</strong>!</p>
            
            <p>Conforme solicitado, segue em anexo o orçamento detalhado para sua análise.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #00695c; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px;"><strong>Valor Total:</strong> ${valorTotal}</p>
            </div>

            <p>Este orçamento é válido por <strong>15 dias</strong>.</p>
            
            <p>Caso tenha dúvidas ou queira aprovar, basta responder este e-mail ou entrar em contato pelo WhatsApp.</p>

            ${linkAprovacao ? `
            <div style="text-align: center; margin-top: 30px;">
                <a href="${linkAprovacao}" style="background-color: #00695c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Aprovar Orçamento Online</a>
            </div>
            ` : ''}
        </div>
        
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #777; border-radius: 0 0 8px 8px;">
            <p>Enviado automaticamente pelo sistema SisGu.</p>
        </div>
    </div>
    `;

    const mailOptions = {
        from: `"SisGu Orçamentos" <${process.env.SMTP_USER}>`,
        to: to,
        subject: subject || `Orçamento #${numeroOrcamento} - ${clienteNome}`,
        html: htmlContent,
        attachments: [
            {
                filename: `Orcamento_${numeroOrcamento}.pdf`,
                content: pdfBase64.split("base64,")[1], // Remove o prefixo data:application/pdf;base64,
                encoding: 'base64'
            }
        ]
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('E-mail enviado: %s', info.messageId);
        res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de e-mail rodando na porta ${PORT}`);
});
