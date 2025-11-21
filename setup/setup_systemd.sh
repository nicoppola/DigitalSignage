#!/bin/bash

# Variables
SERVICE_NAME="digitalsignage-server"
SERVICE_FILE="digitalsignage-server.service"  # Local service file
DEST_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Copy the service file to systemd directory
sudo cp "$SERVICE_FILE" "$DEST_FILE"

# Reload systemd to pick up the new service
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable "$SERVICE_NAME"

# Start the service immediately
sudo systemctl start "$SERVICE_NAME"

# Print status
sudo systemctl status "$SERVICE_NAME" --no-pager

