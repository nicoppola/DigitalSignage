#!/bin/bash

CONFIG_FILE="/boot/firmware/config.txt"
GPU_MEM="256"

# Check if the line already exists
if grep -q "^gpu_mem=" "$CONFIG_FILE"; then
    # Update existing gpu_mem line
    sudo sed -i "s/^gpu_mem=.*/gpu_mem=$GPU_MEM/" "$CONFIG_FILE"
    echo "Updated existing gpu_mem line to $GPU_MEM MB."
else
    # Add gpu_mem line at the end of the file
    echo "gpu_mem=$GPU_MEM" | sudo tee -a "$CONFIG_FILE" > /dev/null
    echo "Added gpu_mem=$GPU_MEM to $CONFIG_FILE."
fi

