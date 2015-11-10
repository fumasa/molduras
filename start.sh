#!/bin/bash

cd /tmp
rm -rf molduras
git clone https://github.com/fumasa/molduras.git
cd molduras
npm install
node .
