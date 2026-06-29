FROM node:18-bullseye

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --upgrade pip && \
    pip3 install --upgrade --force-reinstall yt-dlp

WORKDIR /app

COPY package.json ./

RUN npm install --production --legacy-peer-deps

COPY youtube-shorts-backend.js .

RUN mkdir -p /tmp/chargebee-shorts

EXPOSE 8080

CMD ["node", "youtube-shorts-backend.js"]
