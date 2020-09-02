#!/bin/bash
set -e
HOST=mainframe.aztecprotocol.com
ssh ubuntu@$HOST < bootstrap-ubuntu.sh
#ssh ec2-user@$HOST < bootstrap-centos.sh