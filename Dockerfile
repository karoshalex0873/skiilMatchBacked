# node base
FROM node:alpine

WORKDIR /app

COPY package*.json /app

# Install pnpm globally
RUN npm install -g pnpm

RUN pnpm install

COPY . /app

EXPOSE 4000

CMD [ "pnpm","start" ]


## commmand to run docker
# 1. docker build -t t2gnode .

# 2. docker run -p(for port) --name <name_container> -d(for non blocking) --rm t2gnode
