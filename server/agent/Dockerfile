FROM debian:bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    xpra \
    chromium \
    xvfb \
    python3-dbus \
    python3-gi \
    python3-pil \
    python3-pyinotify \
    python3-netifaces \
    python3-xdg \
    dbus-x11 \
    x11-utils \
    nodejs npm \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Prepare environment
RUN dbus-uuidgen > /etc/machine-id && mkdir -p /run/user/0

# Working dir
WORKDIR /app
RUN npm init -y && npm install chrome-remote-interface

# Add files
COPY start.sh /start.sh

# Permissions
RUN chmod +x /start.sh

# Port for xpra HTML client
EXPOSE 10000

# Entrypoint
CMD ["/start.sh"]