# ==========================================
# Stage 1: Source Extraction
# We name this stage 'cpp-source' to avoid brittle index referencing (like --from=0)
# ==========================================
FROM 278380418400.dkr.ecr.eu-west-2.amazonaws.com/aztec-connect-cpp-x86_64-linux-clang AS cpp-source

# ==========================================
# Stage 2: Builder / Runtime
# Upgraded to Node 20 (Active LTS) and newer Alpine for better security and performance.
# ==========================================
FROM node:20-alpine

# Install system dependencies
# Using --no-cache eliminates the need for 'apk update' and keeps the image small.
RUN apk add --no-cache bash curl

# Copy artifacts from the named stage (cpp-source)
COPY --from=cpp-source /usr/src/aztec-connect-cpp/ /usr/src/aztec-connect-cpp

WORKDIR /usr/src/blockchain-vks

# Copy project files
# IMPORTANT: Ensure you have a .dockerignore file to exclude node_modules, .git, etc.
COPY . .

# Grant execution permissions and run the generation script
# This prevents "permission denied" errors if the file mode was lost during copy.
RUN chmod +x generate_vks.sh && ./generate_vks.sh
