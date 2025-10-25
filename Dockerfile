# Multi-stage build for Vite React app
# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY tsconfig.json vite.config.ts ./
# Copy source
COPY . .

RUN npm ci --silent
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built assets
COPY --from=build /app/dist ./dist

# Install serve for static hosting
RUN npm install -g serve@14.2.3 --silent

# Cloud Run expects the service to listen on $PORT
EXPOSE 8080

# Start the static server, bind to 0.0.0.0 and use PORT env var
CMD ["sh", "-c", "serve -s dist -l 0.0.0.0:$PORT"]
