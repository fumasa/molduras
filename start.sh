#!/bin/bash

cd /tmp
pwd
rm -rf molduras
git clone https://github.com/fumasa/molduras.git
cd molduras
pwd
npm install
node .
