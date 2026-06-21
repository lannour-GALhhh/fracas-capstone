FROM node:20-alpine

WORKDIR /frontend

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

CMD ["npm", "run", "dev", "--", "--host"]