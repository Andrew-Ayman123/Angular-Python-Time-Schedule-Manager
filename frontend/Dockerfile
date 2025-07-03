FROM node:20

WORKDIR /app

COPY . /app

RUN npm install \
    && npm install -g @angular/cli@8.1.2

EXPOSE 4200

CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "4200"]
