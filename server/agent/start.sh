#!/bin/bash
set -e

# Start Xpra on :10000 with TCP and enable remote debugging
xpra start \
    --bind-tcp=0.0.0.0:10000 \
    --html=on \
    --daemon=yes \
    --exit-with-children=no \
    --start-child="chromium --no-sandbox \
                              --disable-gpu \
                              --disable-software-rasterizer \
                              --remote-debugging-port=9222 \
                              --disable-dev-shm-usage \
                              --disable-background-timer-throttling \
                              --disable-renderer-backgrounding \
                              --disable-backgrounding-occluded-windows"

sleep 3

# Keep the container alive by following the xpra log
exec tail -f /run/user/0/xpra/:0.log