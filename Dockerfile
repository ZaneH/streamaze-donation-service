FROM node:16-alpine

RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package.json package-lock.json ./

RUN apk add --update python3 make g++\
   && rm -rf /var/cache/apk/*
RUN npm ci

COPY . .

EXPOSE 8080

CMD ["npm", "start"]