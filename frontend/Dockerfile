# Imagem base com Node.js
FROM node:20-alpine

# Diretório de trabalho dentro do container
WORKDIR /app

# Copia apenas package.json e package-lock.json para instalar dependências
COPY package*.json ./

RUN npm install

# Copia o restante do código
COPY . .

# Expõe a porta do Vite
EXPOSE 5173

# Comando para rodar o servidor de desenvolvimento
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173", "--force"]