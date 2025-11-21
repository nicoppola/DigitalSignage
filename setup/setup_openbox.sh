#!/bin/bash

# Variables
OPENBOX_DIR="$HOME/.config/openbox"
LOCAL_FILE="autostart"
DEST_FILE="$OPENBOX_DIR/autostart"

# Create Openbox config directory if it doesn't exist
mkdir -p "$OPENBOX_DIR"

# Copy the autostart file
cp "$LOCAL_FILE" "$DEST_FILE"

# Make sure it is executable
chmod +x "$DEST_FILE"

echo "Autostart file installed at $DEST_FILE"

