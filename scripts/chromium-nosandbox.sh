#!/bin/sh
# The container's pre-installed Chromium, without the sandbox (it runs as root here).
# For tools that launch Chrome themselves, e.g. the taste skill: CHROME_PATH=scripts/chromium-nosandbox.sh
exec /opt/pw-browsers/chromium --no-sandbox "$@"
