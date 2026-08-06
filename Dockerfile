FROM node:20-bookworm-slim

# ml/predict.py runs alongside the Express API for demand predictions.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY ml/requirements.txt ./ml/requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r ml/requirements.txt

COPY . .

ENV PYTHON_BIN=python3
EXPOSE 3000

CMD ["node", "server.js"]
