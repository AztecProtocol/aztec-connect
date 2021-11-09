#!/bin/bash
set -e

NAME=$1

export AWS_DEFAULT_REGION=us-east-2

>&2 echo "Requesting instance..."
SIR=$(aws ec2 request-spot-instances \
  --spot-price "0.80" \
  --instance-count 1 \
  --type "one-time" \
  --launch-specification file://specification.json \
  --query "SpotInstanceRequests[*].[SpotInstanceRequestId]" \
  --output text)

>&2 echo "Waiting for instance id for spot request: $SIR..."
for i in {1..12}; do
  IID=$(aws ec2 describe-spot-instance-requests \
    --spot-instance-request-ids $SIR \
    --query "SpotInstanceRequests[*].[InstanceId]" \
    --output text)
  [ -z "$IID" -o "$IID" == "None" ] || break
  sleep 5
done

if [ -z "$IID" -o "$IID" == "None" ]; then
  # Cancel spot request.
  aws ec2 cancel-spot-instance-requests --spot-instance-request-ids $SIR > /dev/null
  >&2 echo "Falling back to on-demand instance..."
  # Request on-demand instance.
  IID=$(aws ec2 run-instances \
    --cli-input-json file://specification.json \
    --query "Instances[*].[InstanceId]" \
    --output text)
fi

aws ec2 create-tags --resources $IID --tags "Key=Name,Value=$NAME"
aws ec2 create-tags --resources $IID --tags "Key=Group,Value=build-instance"

aws ec2 describe-instances \
  --filter "Name=instance-id,Values=$IID" \
  --query "Reservations[*].Instances[*].PublicIpAddress" \
  --output=text