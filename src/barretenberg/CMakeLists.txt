# barretenburg
# copyright 2019 Spilsbury Holdings

add_library(
    barretenberg STATIC
    types.hpp
    asm_macros.hpp
    wnaf.hpp
    fr_impl_asm.hpp
    fr_impl_int128.hpp
    fr.hpp
    fq_impl_asm.hpp
    fq_impl_int128.hpp
    fq.hpp
    fq2.hpp
    fq6.hpp
    fq12.hpp
    g1.hpp
    g2.hpp
    scalar_multiplication.hpp
    pairing.hpp
)

set_target_properties(barretenberg PROPERTIES LINKER_LANGUAGE CXX)

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
    asm_macros.hpp
    types.hpp
    wnaf.hpp
    fr_impl_asm.hpp
    fr_impl_int128.hpp
    fr.hpp
    fq_impl_asm.hpp
    fq_impl_int128.hpp
    fq.hpp
    fq2.hpp
    fq6.hpp
    fq12.hpp
    g1.hpp
    g2.hpp
    scalar_multiplication.hpp
    pairing.hpp
)

target_link_libraries(
    barretenberg_profiling
    Threads::Threads
)
set_target_properties(
    barretenberg_profiling
    PROPERTIES LINKER_LANGUAGE CXX RUNTIME_OUTPUT_DIRECTORY ../../test
)

install(
    DIRECTORY
    ${include_dir}/
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)
