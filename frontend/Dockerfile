# 開発用 Dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package.json ./
RUN  npm install

# 5. ソースコードをコピー
COPY . .

EXPOSE 3000
# 開発モードで起動（ホットリロード有効）
CMD ["npm", "run", "dev"]