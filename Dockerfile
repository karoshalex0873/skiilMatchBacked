# Step 1: Use Node.js base image
FROM node:22-alpine

# Step 2: Create app directory
WORKDIR /app

# Step 3: Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Step 4: Copy and install dependencies
COPY package*.json ./
RUN pnpm install

# Step 5: Copy the rest of the source code
COPY . .

# Step 6: Build TypeScript
RUN pnpm run build

# Step 7: Set environment variables (can also be passed in docker-compose.yml)
ENV NODE_ENV=development

# Step 8: Start the app
CMD ["node", "dist/index.js"]
