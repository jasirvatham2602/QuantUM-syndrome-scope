FROM node:20-alpine

WORKDIR /app
COPY package.json server.mjs ./
COPY dist/ ./dist/

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.mjs"]
