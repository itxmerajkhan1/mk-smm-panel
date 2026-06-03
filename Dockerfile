# ==========================================
# STAGE 1: Build dependency and source code
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Enable legacy peer dependencies for strict packages
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy reference source files
COPY . .

# Compile application bundle (Vite + esbuild server compilation)
RUN npm run build

# ==========================================
# STAGE 2: Secure Production Container Environment
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Configure environmental production values
ENV NODE_ENV=production
ENV PORT=3000

# Copy package and lock files to run slim install
COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy compiled codes from the builder container
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/database_store.json ./database_store.json

# Expose server listener port
EXPOSE 3000

# Start production server
CMD ["npm", "run", "start"]
