#!/bin/bash

# Get the actual user's home (not root when running with sudo)
if [ -n "$SUDO_USER" ]; then
    USER_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
else
    USER_HOME="$HOME"
fi

# File to modify
BASH_PROFILE="$USER_HOME/.bash_profile"

# Create the file if it doesn't exist
if [ ! -f "$BASH_PROFILE" ]; then
    touch "$BASH_PROFILE"
    echo "Created $BASH_PROFILE"
fi

# The lines we want to add
AUTO_STARTX='
# Auto-start X on tty1 if not already running
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  startx
fi
'

# Check if the lines already exist to avoid duplicates
if ! grep -Fxq 'if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then' "$BASH_PROFILE"; then
    echo "$AUTO_STARTX" >> "$BASH_PROFILE"
    echo "startx auto-start lines added to $BASH_PROFILE"
else
    echo "startx auto-start lines already present in $BASH_PROFILE"
fi

# Fix ownership if running as root
if [ -n "$SUDO_USER" ]; then
    chown "$SUDO_USER:$SUDO_USER" "$BASH_PROFILE"
fi

