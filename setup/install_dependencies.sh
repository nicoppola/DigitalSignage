#!/bin/bash

# Update & Upgrade
sudo apt update && sudo DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confold" upgrade

# Install Node.js 20.x from NodeSource
echo "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install other dependencies
sudo apt install --no-install-recommends git vim chromium ffmpeg xserver-xorg x11-xserver-utils xinit openbox unclutter -y
