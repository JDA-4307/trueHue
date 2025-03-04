FROM node:18-alpine

# Install global expo-cli
RUN npm install -g expo-cli

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of your React Native app
COPY . .

# Expose the ports for Expo
EXPOSE 19000
EXPOSE 19001
EXPOSE 19002

# Set host to 0.0.0.0 to make it accessible outside the container
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
ENV REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0

# Start Expo development server
CMD ["expo", "start", "--no-dev", "--minify", "--https", "--host", "0.0.0.0"]