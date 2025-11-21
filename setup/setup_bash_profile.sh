#!/bin/bash

# File to modify
BASH_PROFILE="$HOME/.bash_profile"

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

