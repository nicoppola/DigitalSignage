#!/bin/bash

# Update & Upgrade
sudo apt update && sudo DEBIAN_FRONTEND=noninteractive apt-get -y -o Dpkg::Options::="--force-confold" upgrade

# Install dependencies
sudo apt install --no-install-recommends git vim chromium npm xserver-xorg x11-xserver-utils xinit openbox unclutter -y
