#!/bin/bash
# Double-click to start DispatchIQ. Sets up Node 22 the first time.
cd "$(dirname "$0")"
NODE_DIR="$HOME/.dispatchiq-node"
if [ ! -x "$NODE_DIR/bin/node" ]; then
  echo "Downloading Node 22 (one time)..."
  mkdir -p "$NODE_DIR"
  curl -sL https://nodejs.org/dist/v22.12.0/node-v22.12.0-darwin-x64.tar.gz | tar xz -C "$NODE_DIR" --strip-components=1
fi
export PATH="$NODE_DIR/bin:$PATH"
export NODE_OPTIONS=--experimental-require-module
[ -d node_modules ] || npm install
(sleep 6; open http://localhost:3000) &
npm run dev
