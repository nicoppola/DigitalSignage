#!/bin/bash

# Check if running as root/sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run with sudo: sudo ./main_setup.sh"
  exit 1
fi

# Get the directory where this script is located and cd to it
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "Installing Dependencies...."
./install_dependencies.sh

echo ""
echo "Npm Install"
cd ../management-server
npm install
cd ../setup

echo ""
echo "Setting up Bash Profile...."
./setup_bash_profile.sh

echo ""
echo "Setting up Auto Login on Boot...."
./setup_tty.sh

echo ""
echo "Setting up Systemd for Server..."
./setup_systemd.sh 

echo ""
echo "Set up Graphical Boot...."
sudo systemctl set-default graphical.target

echo ""
echo "Configure Open Box...."
./setup_openbox.sh

echo ""
echo "Adding Ram to GPU...."
./add_ram_to_gpu.sh

echo ""
echo "Fixing ownership for $SUDO_USER..."
chown -R "$SUDO_USER:$SUDO_USER" "$SCRIPT_DIR/.."

echo "System will reboot in 5 seconds..."
echo "ctrl c to stop"

# Countdown with indicator
for i in {5..1}; do
    echo "Rebooting in $i..."
    sleep 1
done

# Reboot the system
sudo reboot
