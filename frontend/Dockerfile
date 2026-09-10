# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
# Configure mirror for faster install
RUN npm config set registry https://registry.npmmirror.com
# Use npm ci for deterministic install
RUN npm ci

# Stage 2: Development (Hot Reload)
FROM base AS dev
# Expose Vite port
EXPOSE 3000
# Run dev server host 0.0.0.0 to accessible outside container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# Stage 3: Builder
FROM base AS builder
COPY . .
RUN npm run build

# Stage 4: Production
FROM nginx:alpine AS prod
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
