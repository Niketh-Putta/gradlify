#!/bin/bash
# Double-click this file in Finder to open the gradlify folder and play the demo.
DIR="$(cd "$(dirname "$0")" && pwd)"
open "$DIR"
if [[ -f "$DIR/Gradlify demo video.mp4" ]]; then
  open "$DIR/Gradlify demo video.mp4"
else
  osascript -e 'display alert "Gradlify demo video.mp4 not found. Run: git pull" as warning'
fi
