# barretenberg
# copyright 2019 Spilsbury Holdings

include(GoogleTest)

set(setup_private_include_dir ${PROJECT_SOURCE_DIR}/src)

hunter_add_package(GTest)
find_package(GTest CONFIG REQUIRED)

hunter_add_package(benchmark)
find_package(benchmark CONFIG REQUIRED)

add_subdirectory(benchmarks)

add_executable(
    barretenberg_tests
    test_wnaf.cpp
    test_fq.cpp
    test_fq2.cpp
    test_fr.cpp
    test_g1.cpp
    test_scalar_multiplication.cpp
)

target_link_libraries(
    barretenberg_tests
    PUBLIC
    barretenberg
    ${GMP_LIBRARIES}
    ${LIBFF}
    PRIVATE
        GTest::gtest
        GTest::main
)
target_include_directories(
    barretenberg_tests
    PRIVATE
        ${private_include_dir}
        ${include_dir}
)

set_target_properties(
    barretenberg_tests
    PROPERTIES RUNTIME_OUTPUT_DIRECTORY .
)
gtest_add_tests(
    TARGET
    barretenberg_tests
    TEST_PREFIX
    ${PROJECT_NAME}/test/
)
