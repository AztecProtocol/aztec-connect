# barretenburg
# copyright 2019 Spilsbury Holdings

add_compile_options(-Werror -Wall -Wextra -Wshadow -Wpedantic)
add_compile_options(-Wconversion -Wsign-conversion)

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
    groups/scalar_multiplication.cpp
    groups/scalar_multiplication.hpp
    groups/pairing.cpp
    groups/pairing.hpp
    io/io.hpp
    keccak/hash_types.h
    keccak/keccakf1600.c
    keccak/keccak.c
    keccak/keccak.h
    polynomials/evaluation_domain.cpp
    polynomials/evaluation_domain.hpp
    polynomials/polynomial_arithmetic.cpp
    polynomials/polynomial_arithmetic.hpp
    polynomials/polynomial.cpp
    polynomials/polynomial.hpp
    waffle/linearizer.hpp
    waffle/challenge.hpp
    waffle/permutation.hpp
    waffle/preprocess.hpp
    waffle/verifier.hpp
    waffle/prover.cpp
    waffle/prover.hpp
#   waffle/widgets/base_widget.hpp
#   waffle/widgets/arithmetic_widget.cpp
#   waffle/widgets/arithmetic_widget.hpp
#    waffle/composer/composer.cpp
#    waffle/composer/composer.hpp
#    waffle/circuits/mimc.cpp
#    waffle/circuits/mimc.hpp
)

set_target_properties(
    barretenberg
    
    PROPERTIES
    LINKER_LANGUAGE CXX
)

target_link_libraries(
    barretenberg
)

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
    groups/scalar_multiplication.cpp
    groups/scalar_multiplication.hpp
    groups/pairing.cpp
    groups/pairing.hpp
    io/io.hpp
    keccak/hash_types.h
    keccak/keccakf1600.c
    keccak/keccak.c
    keccak/keccak.h
    polynomials/evaluation_domain.cpp
    polynomials/evaluation_domain.hpp
    polynomials/polynomial_arithmetic.cpp
    polynomials/polynomial_arithmetic.hpp
    polynomials/polynomial.cpp
    polynomials/polynomial.hpp
    waffle/linearizer.hpp
    waffle/challenge.hpp
    waffle/permutation.hpp
    waffle/preprocess.hpp
    waffle/verifier.hpp
    waffle/prover.cpp
    waffle/prover.hpp
)

target_link_libraries(
    barretenberg_profiling
)
set_target_properties(
    barretenberg_profiling

    PROPERTIES
    LINKER_LANGUAGE CXX
    RUNTIME_OUTPUT_DIRECTORY ../../test
)

install(
    DIRECTORY
    ${include_dir}
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
    FILES_MATCHING
    PATTERN "*.hpp"
)
