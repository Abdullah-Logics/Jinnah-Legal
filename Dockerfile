FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json backend/
RUN npm install && cd backend && npm install
COPY . .
ENV VITE_API_URL=
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=build /app /app
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "backend/src/index.js"]
