hunter_add_package(benchmark)
find_package(benchmark CONFIG REQUIRED)

add_executable(
    barretenberg_bench
    bench_barretenberg.cpp
)
target_link_libraries(
    barretenberg_bench
    PUBLIC
    barretenberg
    ${GMP_LIBRARIES}
    ${LIBFF}
    PRIVATE
    benchmark::benchmark
)
target_include_directories(
    barretenberg_bench
    PRIVATE
        ${private_include_dir}
        ${include_dir}
)

set_target_properties(
    barretenberg_bench
    PROPERTIES
    
    COMPILE_FLAGS "-fopenmp"
    RUNTIME_OUTPUT_DIRECTORY ..
)
