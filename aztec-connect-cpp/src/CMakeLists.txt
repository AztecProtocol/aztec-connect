# Adapted from barretenberg/cpp/src/aztec/CMakeLists.txt
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

include_directories(${CMAKE_CURRENT_SOURCE_DIR})

add_compile_options(-Werror -Wall -Wextra -Wconversion -Wsign-conversion -Wno-deprecated -Wno-tautological-compare -Wfatal-errors)

if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
    add_compile_options(-Wno-unguarded-availability-new -Wno-c99-extensions -fconstexpr-steps=100000000)
    if(MEMORY_CHECKS)
        message(STATUS "Compiling with memory checks.")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fsanitize=address")
    endif()
endif()

if(CMAKE_CXX_COMPILER_ID MATCHES "GNU")
    add_compile_options(-Wno-deprecated-copy -fconstexpr-ops-limit=100000000)
endif()

# Comment from barretenberg repo:
# I feel this should be limited to ecc, however it's currently used in headers that go across libraries,
# and there currently isn't an easy way to inherit the DDISABLE_SHENANIGANS parameter.
if(DISABLE_ASM)
    message(STATUS "Using fallback non-assembly methods for field multiplications.")
    add_definitions(-DDISABLE_SHENANIGANS=1)
else()
    message(STATUS "Using optimized assembly for field arithmetic.")
endif()

add_subdirectory(rollup)

if(WASM)
    # Comment from barretenberg repo:
    # Well, this is awkward. We can't build a wasm module by just linking to the libraries as that produces, nothing.
    # There are a couple of other ways to avoiding listing all the object files here and leveraging the dependency
    # tree, but they come with the problem that they will import the 'env' object files. We explicitly want to avoid
    # that as functions in 'env' should be implemented in JS itself.
    # It turns out that just explicitly telling the wasm module which object files to include was easiest.
    message(STATUS "Compiling intermediate aztec-connect WASM exe")
    add_executable(
        aztec-connect-step1.wasm
        $<TARGET_OBJECTS:rollup_proofs_inner_proof_data_objects>
        $<TARGET_OBJECTS:rollup_proofs_notes_objects>
        $<TARGET_OBJECTS:rollup_proofs_account_objects>
        $<TARGET_OBJECTS:rollup_proofs_join_split_objects>
        $<TARGET_OBJECTS:rollup_proofs_claim_objects>
    )

    # Comment from barretenberg repo:
    # With binaryen installed, it seems its wasm backend optimiser gets invoked automatically.
    # Due to either a bug in the optimiser, or non-standards compliant c++ in crypto/aes, tests start failing with
    # -O3 level optimisations. We force down to -O2 for current workaround.
    # Presumably the -O3 when compiling the object files is fine as it's llvms IR optimiser.
    # The backend optimiser is presumably triggered after linking.
    target_link_options(
        aztec-connect-step1.wasm
        PRIVATE
        -nostartfiles -O2 -Wl,--whole-archive -Wl,--no-entry -Wl,--export-dynamic -Wl,--import-memory -Wl,--allow-undefined -Wl,--stack-first -Wl,-z,stack-size=1048576
    )

    target_link_libraries(aztec-connect-step1.wasm barretenberg)

    add_custom_command(
        OUTPUT ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/aztec-connect.wasm
        COMMAND wasm-opt ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/aztec-connect-step1.wasm -O2 --asyncify -o ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/aztec-connect.wasm
        DEPENDS aztec-connect-step1.wasm
        VERBATIM
    )

    add_custom_target(
        aztec-connect.wasm
        DEPENDS ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/aztec-connect.wasm
    )
endif()