# Use LTS version of Node.js for stability
FROM node:20-alpine

# Set environment variables
ENV NODE_ENV=development

# Create app directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --silent && \
    npm install -g @angular/cli@latest

# Copy application source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the development server
CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "3000"]
