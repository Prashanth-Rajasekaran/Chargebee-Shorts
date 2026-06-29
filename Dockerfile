FROM node:20-bookworm

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Download yt-dlp as standalone binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp

WORKDIR /app

COPY package.json ./

RUN npm install --production --legacy-peer-deps

COPY youtube-shorts-backend.js .

RUN mkdir -p /tmp/chargebee-shorts

EXPOSE 8080

CMD ["node", "youtube-shorts-backend.js"]
