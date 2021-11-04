#!/bin/bash
set -e

NAME=$1

>&2 echo "Requesting instance..."
SIR=$(aws ec2 request-spot-instances \
  --region us-east-2 \
  --spot-price "0.80" \
  --instance-count 1 \
  --type "one-time" \
  --launch-specification file://specification.json \
  --query "SpotInstanceRequests[*].[SpotInstanceRequestId]" \
  --output text)

>&2 echo "Waiting for instance id for spot request: $SIR..."
while [ -z "$IID" -o "$IID" == "None" ]; do
  IID=$(aws ec2 describe-spot-instance-requests \
    --region us-east-2 \
    --spot-instance-request-ids $SIR \
    --query "SpotInstanceRequests[*].[InstanceId]" \
    --output text)
  sleep 5
done

aws ec2 create-tags --region us-east-2 --resources $IID --tags "Key=Name,Value=$NAME"

aws ec2 describe-instances \
  --region us-east-2 \
  --filter "Name=instance-id,Values=$IID" \
  --query "Reservations[*].Instances[*].PublicIpAddress" \
  --output=text