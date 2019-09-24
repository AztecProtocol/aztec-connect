# barretenberg
# copyright 2019 Spilsbry Holdings Ltd

cmake_minimum_required(VERSION 3.14)

include(GNUInstallDirs)
include(cmake/OptimizeForArchitecture.cmake)
include(cmake/AddCompilerFlag.cmake)

set(PROJECT_VERSION 0.1.0)
project(Barretenberg
    DESCRIPTION "BN254 elliptic curve library, and PLONK SNARK prover"
    LANGUAGES CXX C)

set(default_build_type "Release")

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_EXTENSIONS ON)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED TRUE)
set(CMAKE_CXX_EXTENSIONS ON)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -march=native -O3 -fopenmp")

set(include_dir ${CMAKE_CURRENT_SOURCE_DIR}/include)
set(private_include_dir ${PROJECT_SOURCE_DIR}/src)
set(DEPENDS_DIR ${PROJECT_SOURCE_DIR}/depends)


add_definitions(-DBARRETENBERG_SRS_PATH=\"${CMAKE_CURRENT_SOURCE_DIR}/srs_db/transcript.dat\")
add_subdirectory(src)

option(BARRETENBERG_TESTING "Build tests" ON)

if(BARRETENBERG_TESTING)
    enable_testing()
    add_subdirectory(test)
endif()