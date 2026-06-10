# Этап 1: Сборка React/Vite приложения
FROM node:20-alpine AS build

WORKDIR /app

# Установка зависимостей
COPY package*.json ./
RUN npm install

# Копирование исходного кода и сборка в dist/
COPY . .
RUN npm run build

# Этап 2: Раздача статики через Nginx
FROM nginx:alpine

# Копирование конфигурационного файла Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копирование собранного SPA-дистрибутива
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
