include(FetchContent)

### DEPENDENCIES
FetchContent_Declare(
    benchmark
    GIT_REPOSITORY https://github.com/google/benchmark
    GIT_TAG v1.5.0
)

FetchContent_GetProperties(benchmark)
if(NOT benchmark_POPULATED)
  fetchcontent_populate(benchmark)
  add_subdirectory(${benchmark_SOURCE_DIR} ${benchmark_BINARY_DIR} EXCLUDE_FROM_ALL)
endif()

add_compile_options(-Werror -Wall -Wextra -Wshadow)
add_compile_options(-Wconversion -Wsign-conversion)

add_executable(
    barretenberg_bench
    bench_barretenberg.cpp
)
target_link_libraries(
    barretenberg_bench
    PUBLIC
    barretenberg
    PRIVATE
    benchmark
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
    
    RUNTIME_OUTPUT_DIRECTORY ..
)
