const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

// Global error handlers to prevent silent crashes
process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR: Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Debug: Check if dist exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
    console.error("❌ CRITICAL: Pasta 'dist' não encontrada! O build do Vite falhou ou não foi copiado corretamente.");
} else {
    console.log("✅ Pasta 'dist' encontrada.");
}

// Serve static files from React build
app.use(express.static(distPath));

// Request logging
app.use((req, res, next) => {
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Email Configuration
// const { firebaseConfigured } = require("./src/config/firebase"); // Keep commented as per original

const smtpPort = Number(process.env.SMTP_PORT) || 587;
const secure = smtpPort === 465;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.locaweb.com.br',
    port: smtpPort,
    secure: secure,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Health Check
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Send Quote Email
app.post('/api/send-orcamento', async (req, res) => {
    const {
        to,
        subject,
        clienteNome,
        numeroOrcamento,
        valorTotal,
        pdfBase64
    } = req.body;

    if (!to || !pdfBase64) {
        return res.status(400).json({ success: false, message: 'Faltando destinatário ou PDF.' });
    }

    console.log(`Enviando orçamento ${numeroOrcamento} para ${to}... usando porta ${smtpPort}`);

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background-color: #00695c; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">Orçamento #${numeroOrcamento}</h2>
        </div>
        <div style="padding: 30px;">
            <p>Olá, <strong>${clienteNome}</strong>!</p>
            <p>Segue em anexo o orçamento solicitado.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #00695c; margin: 20px 0;">
                <p style="margin: 0; font-size: 16px;"><strong>Valor Total:</strong> ${valorTotal}</p>
            </div>
            <p>Qualquer dúvida, estamos à disposição.</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #777;">
            <p>Enviado automaticamente pelo sistema SisGu.</p>
        </div>
    </div>
    `;

    const mailOptions = {
        from: `"SisGu Orçamentos" <${process.env.SMTP_USER}>`,
        to: to,
        subject: subject || `Orçamento #${numeroOrcamento}`,
        html: htmlContent,
        attachments: [
            {
                filename: `Orcamento_${numeroOrcamento}.pdf`,
                content: pdfBase64.split("base64,")[1],
                encoding: 'base64'
            }
        ]
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ E-mail enviado: %s', info.messageId);
        res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('❌ Erro ao enviar:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// SPA Fallback
app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        console.error("❌ CRITICAL: index.html not found in dist folder!");
        res.status(500).send("Internal Server Error: Build artifact missing.");
    }
});

const PORT = process.env.PORT || 8080;
// CRITICAL: Explicitly bind to 0.0.0.0 for Cloud Run
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor SisGu rodando na porta ${PORT}`);
});