#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Get the actual user's home (not root when running with sudo)
if [ -n "$SUDO_USER" ]; then
    USER_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
else
    USER_HOME="$HOME"
fi

# Variables
OPENBOX_DIR="$USER_HOME/.config/openbox"
LOCAL_FILE="$SCRIPT_DIR/autostart"
DEST_FILE="$OPENBOX_DIR/autostart"

# Create Openbox config directory if it doesn't exist
mkdir -p "$OPENBOX_DIR"

# Copy the autostart file
cp "$LOCAL_FILE" "$DEST_FILE"

# Make sure it is executable
chmod +x "$DEST_FILE"

# Fix ownership if running as root
if [ -n "$SUDO_USER" ]; then
    chown -R "$SUDO_USER:$SUDO_USER" "$USER_HOME/.config"
fi

echo "Autostart file installed at $DEST_FILE"

