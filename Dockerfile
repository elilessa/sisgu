
# 1. Base: Node.js 18
FROM node:20-alpine

# 2. Diretório de trabalho no container
WORKDIR /app

# 3. Copia package.json para instalar dependências
COPY package.json package-lock.json ./
RUN npm ci --omit=dev  
# (Se precisar de devDependencies para build, use 'npm install' normal)
RUN npm install

# 4. Copia o código fonte todo
COPY . .

# 5. Build do React (Vite)
RUN npm run build

# 6. Variáveis de ambiente padrão (Porta do Cloud Run)
ENV PORT=8080

# 7. Expor a porta 8080
EXPOSE 8080

# 8. Comando para iniciar
CMD [ "node", "server.cjs" ]
