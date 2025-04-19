# node base
FROM node:alpine

WORKDIR /app

COPY package*.json /app

# Install pnpm globally
RUN npm install -g pnpm

RUN pnpm install

COPY . /app

# Build TypeScript files
RUN pnpm build

EXPOSE 80

CMD [ "pnpm","start" ]


## commmand to run docker
# 1. docker build -t t2gnode .

# 2. docker run -p(for port) --name <name_container> -d(for non blocking) --rm t2gnode

# on aws  
# 1.  docker build -t karoshalex0873/skillmatch_ai .
# 2    docker push karoshalex0873/skillmatch_ai
