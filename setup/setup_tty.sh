#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Variables
OVERRIDE_DIR="/etc/systemd/system/getty@tty1.service.d"
OVERRIDE_FILE="$OVERRIDE_DIR/autologin.conf"
LOCAL_FILE="$SCRIPT_DIR/autologin.conf"

# Create the directory for the override if it doesn't exist
sudo mkdir -p "$OVERRIDE_DIR"

# Copy the override file
sudo cp "$LOCAL_FILE" "$OVERRIDE_FILE"

# Reload systemd to pick up the new override
sudo systemctl daemon-reexec

# Set graphical target as default
sudo systemctl set-default graphical.target

