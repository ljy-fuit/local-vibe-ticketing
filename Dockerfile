FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy Lua scripts
COPY --from=builder /app/src/ticketing/common/redis/lua-scripts ./dist/ticketing/common/redis/lua-scripts

ENV NODE_ENV=production
ENV PORT=46680

EXPOSE 46680

CMD ["node", "dist/main.js"]
