# Build System

The Aztec build system runs on Circle CI. There were several requirements to be met in it's design. There is still room for improvement.

### Requirements

- Monorepo support.
- Builds docker containers for simple deployments.
- Docker layer caching support to minimise rebuild times.
- Easy to follow build graph on Circle CI.
- Deploy updated services only on a fully successful build of entire project.
- Not too tightly integrated with Circle CI in case needs shift.

### Overview

Circle CI is only needed to orchestrate the workflow. There are scripts that are called from the `.circleci/config.yml` that could be fairly easily run elsewhere if needed. They are located in the `.circleci` folder, and are added to `PATH` so they can be called from project directories. The purpose of each of these will detailed below. The actual building of the services and libraries are all done with Dockerfiles.

There are two ECR (elastic container repository) instances used in two regions (`eu-west2` and `us-east2`). As containers are built, the results are stored in `us-east2` (deemed to be generally close to Circle CI) and these are considered to be caches that can be reused in subsequent builds. In the event of a deploy, the containers are published in `eu-west2` where all infrastructure is currently hosted. These are considered our live production builds.

We do not use Circle CI's "docker layer caching" feature, because:

- There is no guarantee the cache will be available between workflow steps or builds.
- There is not one single cache, but multiple caches which are randomly attached to your job.

For this reason it's impossible to use it for anything useful.

### config.yml

The Circle CI config file. Each project has its own entry and will call one or more of the scripts, usually `build`. There is a deploy stage that calls the `deploy` script for each project. A workflow graph is established ensuring that dependent projects are built in the right order, and allowing the developer to see the build graph in the dashboard.

### setenv

Each project will call this after checking out the code. It writes several environment varables to a bash script that is executed at the start of each step in a job. An important variable is determining the base commit from which we can establish which files have changed.

### changed \<path>

Returns true if the file at path has changed since the base commit.

### check_rebuild

Run inside a given project, will return true if any of the files changed since the base commit, match a path inside the `.rebuild_patterns` file. This is a functional, if pretty ropey way of letting the build system determine if a project actually needs to be rebuilt. Rather than intelligently figuring out the dependencies of the project, and seeing if any of the dependencies have changes, we need to list all depenedent file paths within the `.rebuild_patterns` file. It does actually have the nice effect of allowing very well specified rebuild rules, right down to the granularity of a single file, but as a tradeoff it needs to be written in the first place.

This could be improved in the future.

### ensure_repo \<repository name> \<region>

Logs the shell into the ECR instance at the given region, establishes if the given repository exists and creates it if it doesn't. If the lifecycle policy changed (determines when images should be automatically deleted), reapplies the policy.

### ensure_terraform

Downloads and installs `terraform` if it's not installed.

### image_exists \<repository> \<tag>

Returns true if the given image exists in the current ECR.

### build \<image>

- Logs into cache ECR, and ensures repository exists.
- Checks if current project needs to be rebuilt as per `.rebuild_patterns`, or if no master build exists.
- Pull down dependent images that we do not control (e.g. alpine etc).
- For images we do control, either pull the image we've built as part of this build, or get the master build.
- To prime the layer cache, pull the previous build of this project, or get it's master build.
- For each "named stage" (usually intermittent builders before creating final image), prime the cache like above, build and push the results.
- Perform the build of the image itself. With all parent images pulled, named stages built, and prior builds being used as caches, we should only have to rebuild the necessary layers.
- Push the image with two tags, one associated with the branch (used for priming caches in subsequent builds), and one associated with the commit (used for deploying).
- Validate any terraform that may exist.

### deploy \<image>

- Logs into cache ECR.
- Pushes new master build to cache.
- Logs into deploy ECR.
- Pushes image to deployment repository.
- Applies any terraform and restarts the service if it exists.
