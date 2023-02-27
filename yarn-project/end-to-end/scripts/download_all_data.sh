#!/bin/bash
# Run with `time` in order to get both the time to download all data, and the total data size.

URL=${1:-https://api.aztec.network/aztec-connect-prod/falafel}
BYTES=0
TOTAL=0
FROM=0
TAKE=128
export LC_NUMERIC="en_US.utf8"

while [ "$BYTES" -ne 4 ]; do
  BYTES=$(curl -s "$URL/get-blocks?from=$FROM&take=$TAKE" | wc -c)
  TOTAL=$[$TOTAL + $BYTES]
  TO=$[$FROM + $TAKE - 1]
  if [ "$BYTES" -ne 4 ]; then
    printf "Blocks $FROM to $TO: %'d bytes / %'d total.\n" $BYTES $TOTAL
  fi
  FROM=$[$FROM + $TAKE]
done