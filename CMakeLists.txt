# barretenberg
# copyright 2019 Spilsbry Holdings Ltd

cmake_minimum_required(VERSION 3.14)

if(APPLE)
    set(CMAKE_CXX_COMPILER "/usr/local/opt/llvm/bin/clang++")
    set(CMAKE_C_COMPILER "/usr/local/opt/llvm/bin/clang")
endif()

include(GNUInstallDirs)
include(cmake/OptimizeForArchitecture.cmake)
include(cmake/AddCompilerFlag.cmake)

set(PROJECT_VERSION 0.1.0)
project(Barretenberg
    DESCRIPTION "BN254 elliptic curve library, and PLONK SNARK prover"
    LANGUAGES CXX C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_EXTENSIONS ON)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED TRUE)
set(CMAKE_CXX_EXTENSIONS ON)

if(APPLE)
    if(CMAKE_C_COMPILER_ID MATCHES "Clang")
        set(OpenMP_C_FLAGS "-fopenmp")
        set(OpenMP_C_FLAGS_WORK "-fopenmp")
        set(OpenMP_C_LIB_NAMES "libomp")
        set(OpenMP_C_LIB_NAMES_WORK "libomp")
        set(OpenMP_libomp_LIBRARY "/usr/local/lib/libomp.a")
    endif()
    if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
        set(OpenMP_CXX_FLAGS "-fopenmp")
        set(OpenMP_CXX_FLAGS_WORK "-fopenmp")
        set(OpenMP_CXX_LIB_NAMES "libomp")
        set(OpenMP_CXX_LIB_NAMES_WORK "libomp")
        set(OpenMP_libomp_LIBRARY "/usr/local/lib/libomp.a")
    endif()
endif()

option(MULTITHREADING default ON)

find_package(OpenMP)
if(OpenMP_CXX_FOUND AND MULTITHREADING)
    link_libraries(OpenMP::OpenMP_CXX)
else()
    add_definitions(-DNO_MULTITHREADING=1)
endif()

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

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -Wno-format -Wno-conversion")

set(include_dir ${CMAKE_CURRENT_SOURCE_DIR}/include)
set(private_include_dir ${PROJECT_SOURCE_DIR}/src)
set(DEPENDS_DIR ${PROJECT_SOURCE_DIR}/depends)


add_definitions(-DBARRETENBERG_SRS_PATH=\"../srs_db/transcript.dat\")
add_subdirectory(src)

option(BARRETENBERG_TESTING "Build tests" ON)

if(BARRETENBERG_TESTING)
    message(STATUS "Configuring tests and benchmarks")
    enable_testing()
    add_subdirectory(test)
endif()