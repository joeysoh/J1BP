#!/bin/bash
# This builds the Quasar app and deploys it to Vercel
# run "vercel link" in ./.vercel/build/ first to create .vercel, project id in project.json (CLI: create new or search for existing)
npm run build
mkdir -p ./.vercel/build
find ./.vercel/build -mindepth 1 -maxdepth 1 ! -name '.vercel' -exec rm -rf {} +
cp -r ./dist/. ./.vercel/build/
cp ./vercel.json ./.vercel/build/
vercel --prod --yes ./.vercel/build