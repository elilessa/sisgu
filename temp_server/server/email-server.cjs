const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.EMAIL_SERVER_PORT || 3001;

app.use(cors());
app.use(express.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Erro na configuracao do email:', error.message);
  } else {
    console.log('Servidor de email pronto para enviar mensagens');
  }
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatorios: to, subject, html' 
      });
    }

    const mailOptions = {
      from: `"Sistema de Gestao" <${process.env.GMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email enviado:', info.messageId);
    res.json({ 
      success: true, 
      messageId: info.messageId 
    });

  } catch (error) {
    console.error('Erro ao enviar email:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'email-server' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de email rodando na porta ${PORT}`);
});
