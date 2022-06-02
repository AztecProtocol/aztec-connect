add_executable(generate_vkhash main.cpp)

    target_link_libraries(generate_vkhash keygen PRIVATE rollup_proofs_root_verifier env)