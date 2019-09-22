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

message(INFO "INCLUDE_DIR = ${include_dir}\n")
message(INFO "DEPENDS_DIR = ${DEPENDS_DIR}\n")
message(INFO "CMAKE_INSTALL_INCLUDEDIR = ${CMAKE_INSTALL_INCLUDEDIR}\n")

add_subdirectory(src)

option(BARRETENBERG_TESTING "Build tests" ON)

if(BARRETENBERG_TESTING)
    # GMP
    find_path(GMP_INCLUDE_DIR NAMES gmp.h)
    find_library(GMP_LIBRARIES NAMES gmp libgmp)
    find_library(GMPXX_LIBRARIES NAMES gmpxx libgmpxx)

    find_path(LIBFF_INCLUDE_DIR NAMES libff.a)
    find_library(LIBFF NAMES libff libff.a ibff HINTS /usr/local/lib)

    enable_testing()
    add_subdirectory(test)
endif()