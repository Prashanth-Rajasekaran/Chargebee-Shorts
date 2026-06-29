FROM node:18-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install yt-dlp

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production || npm install --production

COPY youtube-shorts-backend.js ./

RUN mkdir -p /tmp/chargebee-shorts

EXPOSE 8080

CMD ["node", "youtube-shorts-backend.js"]
