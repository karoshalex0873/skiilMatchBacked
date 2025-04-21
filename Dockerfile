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


# restating the docker file 
# 1. ssh -i "backend.pem" ec2-user@13.61.182.189
# 2.sudo docker rm -f backend || true (reomoving the docker)
# 3 push(git hub ) or restart manully : sudo docker run -d -p 80:80 --name backend karoshalex0873/skillmatch_ai
