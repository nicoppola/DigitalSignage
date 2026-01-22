#!/bin/bash

# Copy journald config to limit log sizes
sudo cp journald.conf /etc/systemd/journald.conf.d/digitalsignage.conf

# Restart journald to apply changes
sudo systemctl restart systemd-journald

echo "Journald log limits configured."
