FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci && npm cache clean --force

COPY . .

# Build the Next.js application
RUN npm run build

EXPOSE 3001

USER node

CMD ["npm", "start"]