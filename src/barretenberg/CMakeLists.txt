# barretenburg
# copyright 2019 Spilsbury Holdings

add_library(
    barretenberg STATIC
    types.hpp
    wnaf.hpp
    fr_impl.cpp
    fr.hpp
    fq_impl_asm.hpp
    fq_impl_int128.hpp
    fq.hpp
    g1.hpp
    scalar_multiplication.hpp
)

set_target_properties(barretenberg PROPERTIES LINKER_LANGUAGE CXX)

target_link_libraries(
    barretenberg
    PUBLIC
        ${GMP_LIBRARIES}
)

install(
    DIRECTORY
    ${include_dir}/
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)
