FROM node:20-alpine

WORKDIR /app

# Copy root package files if needed, or backend package.json
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend ./

EXPOSE 5001

ENV NODE_ENV=production
ENV PORT=5001

CMD ["node", "src/server.js"]
