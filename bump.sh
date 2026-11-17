#!/bin/sh
# מעדכן גרסה: version.txt (מה שעל השרת) ו-js/build.js (הגרסה שבקוד) – תמיד יחד
V=$(date -u +%Y%m%d%H%M)
echo "$V" > version.txt
echo "export const BUILD = '$V';" > js/build.js
