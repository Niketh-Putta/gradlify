#!/bin/bash
# Double-click this in Finder to reveal Gradlify demo video.mp4
DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "$DIR/Gradlify demo video.mp4" ]]; then
  open -R "$DIR/Gradlify demo video.mp4"
else
  osascript -e 'display alert "Gradlify demo video.mp4 not found. Run: git pull" as warning'
fi
