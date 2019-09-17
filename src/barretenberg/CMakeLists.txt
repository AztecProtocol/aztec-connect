# barretenburg
# copyright 2019 Spilsbury Holdings

add_library(
    barretenberg STATIC
    types.hpp
    fields/asm_macros.hpp
    fields/fr_impl_asm.hpp
    fields/fr_impl_int128.hpp
    fields/fr.hpp
    fields/fq_impl_asm.hpp
    fields/fq_impl_int128.hpp
    fields/fq.hpp
    fields/fq2.hpp
    fields/fq6.hpp
    fields/fq12.hpp
    groups/wnaf.hpp
    groups/g1.hpp
    groups/g2.hpp
    groups/scalar_multiplication.hpp
    groups/pairing.hpp
    polynomials/polynomials.cpp
    polynomials/polynomials.hpp
    waffle/waffle.cpp
    waffle/waffle.hpp
)

set_target_properties(
    barretenberg
    
    PROPERTIES
    LINKER_LANGUAGE CXX
    COMPILE_FLAGS "-fopenmp"
)

target_link_libraries(
    barretenberg
    PUBLIC
        ${GMP_LIBRARIES}
)

set(THREADS_PREFER_PTHREAD_FLAG ON)
find_package(Threads REQUIRED)

add_executable(
    barretenberg_profiling
    main.cpp
    fields/asm_macros.hpp
    types.hpp
    fields/fr_impl_asm.hpp
    fields/fr_impl_int128.hpp
    fields/fr.hpp
    fields/fq_impl_asm.hpp
    fields/fq_impl_int128.hpp
    fields/fq.hpp
    fields/fq2.hpp
    fields/fq6.hpp
    fields/fq12.hpp
    groups/wnaf.hpp
    groups/g1.hpp
    groups/g2.hpp
    groups/scalar_multiplication.hpp
    groups/pairing.hpp
    polynomials/polynomials.cpp
    polynomials/polynomials.hpp
    waffle/waffle.cpp
    waffle/waffle.hpp
)

target_link_libraries(
    barretenberg_profiling
    Threads::Threads
)
set_target_properties(
    barretenberg_profiling

    PROPERTIES
    COMPILE_FLAGS "-fopenmp"
    LINKER_LANGUAGE CXX
    RUNTIME_OUTPUT_DIRECTORY ../../test
)

install(
    DIRECTORY
    ${include_dir}/
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
    FILES_MATCHING
    PATTERN "*.hpp"
)
