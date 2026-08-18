# CraScaper is a multi-service stack (frontend, API, crawler, Postgres, RabbitMQ, nginx).
# A single image cannot run the platform. Use Compose from this directory:
#
#   docker compose up --build
#
# App:        http://localhost:8080
# Vite:       http://localhost:5173
# API:        http://localhost:4000/api/health
# RabbitMQ:   http://localhost:15672
FROM nginx:1.27-alpine
COPY infrastructure/docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
