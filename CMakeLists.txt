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
# Set a default build type if none was specified

if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  message(STATUS "Setting build type to '${default_build_type}' as none was specified.")
  set(CMAKE_BUILD_TYPE "${default_build_type}" CACHE
      STRING "Choose the type of build." FORCE)
  # Set the possible values of build type for cmake-gui
  set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS
    "Debug" "Release" "MinSizeRel" "RelWithDebInfo")
endif()

option(DISABLE_SHENANIGANS default OFF)

if(DISABLE_SHENANIGANS)
    message(STATUS "Using fallback non-assembly methods for field multiplications")
    add_definitions(-DDISABLE_SHENANIGANS=1)
endif()

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
    message(STATUS "Compiling tests and benchmarks")
    enable_testing()
    add_subdirectory(test)
endif()