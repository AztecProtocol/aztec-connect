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
    waffle/reference_string/reference_string.cpp
    waffle/reference_string/reference_string.hpp
    waffle/proof_system/linearizer.hpp
    waffle/proof_system/challenge.hpp
    waffle/proof_system/permutation.hpp
    waffle/proof_system/preprocess.hpp
    waffle/proof_system/widgets/base_widget.hpp
    waffle/proof_system/widgets/arithmetic_widget.cpp
    waffle/proof_system/widgets/arithmetic_widget.hpp
    waffle/proof_system/widgets/bool_widget.cpp
    waffle/proof_system/widgets/bool_widget.hpp
    waffle/proof_system/widgets/mimc_widget.cpp
    waffle/proof_system/widgets/mimc_widget.hpp
    waffle/proof_system/widgets/sequential_widget.cpp
    waffle/proof_system/widgets/sequential_widget.hpp
    waffle/proof_system/prover/prover.cpp
    waffle/proof_system/prover/prover.hpp
    waffle/proof_system/verifier/verifier.cpp
    waffle/proof_system/verifier/verifier.hpp
    waffle/composer/composer_base.hpp
    waffle/composer/standard_composer.cpp
    waffle/composer/standard_composer.hpp
    waffle/composer/bool_composer.cpp
    waffle/composer/bool_composer.hpp
    waffle/composer/mimc_composer.cpp
    waffle/composer/mimc_composer.hpp
    waffle/stdlib/common.hpp
    waffle/stdlib/bool/bool.tcc
    waffle/stdlib/bool/bool.hpp
    waffle/stdlib/field/field.tcc
    waffle/stdlib/field/field.hpp
    waffle/stdlib/uint32/uint32.tcc
    waffle/stdlib/uint32/uint32.hpp
    waffle/stdlib/mimc.tcc
    waffle/stdlib/mimc.hpp
)

set_target_properties(
    barretenberg

    PROPERTIES
    LINKER_LANGUAGE CXX
)

target_link_libraries(
    barretenberg
)

if(BARRETENBERG_PROFILING)
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
        waffle/reference_string/reference_string.cpp
        waffle/reference_string/reference_string.hpp
        waffle/proof_system/linearizer.hpp
        waffle/proof_system/challenge.hpp
        waffle/proof_system/permutation.hpp
        waffle/proof_system/preprocess.hpp
        waffle/proof_system/widgets/base_widget.hpp
        waffle/proof_system/widgets/arithmetic_widget.cpp
        waffle/proof_system/widgets/arithmetic_widget.hpp
        waffle/proof_system/widgets/bool_widget.cpp
        waffle/proof_system/widgets/bool_widget.hpp
        waffle/proof_system/widgets/mimc_widget.cpp
        waffle/proof_system/widgets/mimc_widget.hpp
        waffle/proof_system/widgets/sequential_widget.cpp
        waffle/proof_system/widgets/sequential_widget.hpp
        waffle/proof_system/prover/prover.cpp
        waffle/proof_system/prover/prover.hpp
        waffle/proof_system/verifier/verifier.cpp
        waffle/proof_system/verifier/verifier.hpp
        waffle/composer/composer_base.hpp
        waffle/composer/standard_composer.cpp
        waffle/composer/standard_composer.hpp
        waffle/composer/bool_composer.cpp
        waffle/composer/bool_composer.hpp
        waffle/composer/mimc_composer.cpp
        waffle/composer/mimc_composer.hpp
        waffle/stdlib/common.hpp
        waffle/stdlib/bool/bool.tcc
        waffle/stdlib/bool/bool.hpp
        waffle/stdlib/field/field.tcc
        waffle/stdlib/field/field.hpp
        waffle/stdlib/uint32/uint32.tcc
        waffle/stdlib/uint32/uint32.hpp
        waffle/stdlib/mimc.tcc
        waffle/stdlib/mimc.hpp
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
endif()

install(
    DIRECTORY
    ${include_dir}
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
    FILES_MATCHING
    PATTERN "*.hpp"
)
