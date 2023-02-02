add_executable(
    tx_factory
    main.cpp
)

target_link_libraries(
    tx_factory
    barretenberg
    rollup_proofs_root_verifier
)