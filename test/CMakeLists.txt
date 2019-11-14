# barretenberg
# copyright 2019 Spilsbury Holdings

include(FetchContent)

### DEPENDENCIES
FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG release-1.8.0
)

FetchContent_GetProperties(googletest)
if(NOT googletest_POPULATED)
    FetchContent_Populate(googletest)
    add_subdirectory(${googletest_SOURCE_DIR} ${googletest_BINARY_DIR} EXCLUDE_FROM_ALL)
endif()

mark_as_advanced(
    BUILD_GMOCK BUILD_GTEST BUILD_SHARED_LIBS
    gmock_build_tests gtest_build_samples gtest_build_tests
    gtest_disable_pthreads gtest_force_shared_crt gtest_hide_internal_symbols
)

set(setup_private_include_dir ${PROJECT_SOURCE_DIR}/src)

add_subdirectory(benchmarks)

add_compile_options(-Werror -Wall -Wextra -Wshadow)
add_compile_options(-Wconversion -Wsign-conversion)

add_executable(
    barretenberg_tests
    test_wnaf.cpp
    test_fq.cpp
    test_fq2.cpp
    test_fq6.cpp
    test_fq12.cpp
    test_fr.cpp
    test_g1.cpp
    test_g2.cpp
    test_scalar_multiplication.cpp
    test_pairing.cpp
    test_io.cpp
    test_polynomial_arithmetic.cpp
    test_preprocess.cpp
    test_prover.cpp
    test_verifier.cpp
    test_verifier.cpp
    composer/test_standard_composer.cpp
    composer/test_mimc_composer.cpp
    composer/test_bool_composer.cpp
    stdlib/test_stdlib_bool.cpp
    stdlib/test_stdlib_field.cpp
    stdlib/test_stdlib_uint32.cpp
    stdlib/test_stdlib_mimc.cpp
)

set_target_properties(
    barretenberg_tests
    PROPERTIES

    RUNTIME_OUTPUT_DIRECTORY .
)

if (WIN32)
    target_link_libraries(
        barretenberg_tests
        PUBLIC
        barretenberg
        PRIVATE
        gtest
        gmock
        gtest_main
        wsock32
        ws2_32
    )
else()
    target_link_libraries(
        barretenberg_tests
        PUBLIC
        barretenberg
        PRIVATE
        gtest
        gmock
        gtest_main
    )
endif()

target_include_directories(
    barretenberg_tests
    PRIVATE
        ${private_include_dir}
        ${include_dir}
)


add_test(
    TARGET
    barretenberg_tests
    TEST_PREFIX
    ${PROJECT_NAME}/test/
)
