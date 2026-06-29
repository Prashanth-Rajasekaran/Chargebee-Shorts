FROM node:18-bullseye

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --upgrade pip setuptools wheel && \
    pip3 install yt-dlp

WORKDIR /app

COPY package.json ./

RUN npm install --production --legacy-peer-deps

COPY youtube-shorts-backend.js ./

RUN mkdir -p /tmp/chargebee-shorts

EXPOSE 8080

CMD ["node", "youtube-shorts-backend.js"]
