#!/bin/bash

cd /tmp
echo ´pwd´
rm -rf molduras
git clone https://github.com/fumasa/molduras.git
cd molduras
echo ´pwd´
npm install
node .
