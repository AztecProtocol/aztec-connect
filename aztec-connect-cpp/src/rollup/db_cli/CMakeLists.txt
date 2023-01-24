add_executable(
    db_cli
    main.cpp
)

target_link_libraries(
    db_cli
    PRIVATE
    barretenberg
    rollup_proofs_root_verifier
)