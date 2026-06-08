#!/bin/bash
# Script to copy Gradlify demo video to Mac Finder Favourites GRADLIFY folder
# Run this on Niketh's Mac after git pull

set -e

# Find the GRADLIFY favourites folder (contains Gradlify-Partner-Overview.pptx)
GRADLIFY_FAV=""
for path in \
  "$HOME/Downloads/Projects/Gradlify" \
  "$HOME/Downloads/Gradlify" \
  "$HOME/Documents/Gradlify" \
  "$HOME/Desktop/Gradlify"
do
  if [[ -f "$path/Gradlify-Partner-Overview.pptx" ]] || [[ -d "$path/Codes" ]]; then
    GRADLIFY_FAV="$path"
    break
  fi
done

if [[ -z "$GRADLIFY_FAV" ]]; then
  echo "❌ Could not find GRADLIFY favourites folder with pptx or Codes/"
  echo "Please edit this script with the correct path"
  exit 1
fi

# Find the repo location (where this script is)
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

# Copy video to favourites folder
if [[ -f "$REPO_DIR/Gradlify demo video.mp4" ]]; then
  cp "$REPO_DIR/Gradlify demo video.mp4" "$GRADLIFY_FAV/"
  echo "✅ Copied video to: $GRADLIFY_FAV/Gradlify demo video.mp4"
  
  # Reveal in Finder
  open -R "$GRADLIFY_FAV/Gradlify demo video.mp4"
  echo "✅ Revealed in Finder"
else
  echo "❌ Video not found at: $REPO_DIR/Gradlify demo video.mp4"
  echo "Run: git pull"
  exit 1
fi
