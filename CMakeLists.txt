# barretenburg
# copyright 2019 Spilsbury Holdings

cmake_minimum_required(VERSION 3.5)

include(cmake/cable/bootstrap.cmake)
include(CableBuildType)
include(CableCompilerSettings)
include(CableToolchains)
include(GNUInstallDirs)

cable_configure_toolchain(DEFAULT cxx17)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -march=broadwell -msse2 -mavx -O3")

include(HunterConfig)

cable_set_build_type(DEFAULT Release CONFIGURATION_TYPES Debug Release)

set(PROJECT_VERSION 0.1.0)
project(barretenberg)

set(HUNTER_NO_TOOLCHAIN_ID_RECALCULATION ON)

cable_configure_compiler(NO_PEDANTIC NO_CONVERSION_WARNINGS)

set(include_dir ${CMAKE_CURRENT_SOURCE_DIR}/include)

set(private_include_dir ${PROJECT_SOURCE_DIR}/src)
set(DEPENDS_DIR ${PROJECT_SOURCE_DIR}/depends)

message(INFO " INCLUDE_DIR = ${include_dir}\n")
message(INFO " DEPENDS_DIR = ${DEPENDS_DIR}\n")


### DEPENDENCIES


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
