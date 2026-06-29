FROM node:18-bullseye

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3.11 \
    python3.11-dev \
    python3.11-venv \
    python3-pip \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN python3.11 -m pip install --upgrade pip setuptools wheel && \
    python3.11 -m pip install --upgrade yt-dlp

WORKDIR /app

COPY package.json ./

RUN npm install --production --legacy-peer-deps

COPY youtube-shorts-backend-FINAL.js youtube-shorts-backend.js

RUN mkdir -p /tmp/chargebee-shorts

EXPOSE 8080

CMD ["node", "youtube-shorts-backend.js"]
