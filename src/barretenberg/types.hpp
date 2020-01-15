#pragma once

#include <cstddef>
#include <cstdint>
#include <cstdlib>

#ifdef _WIN32
#include "./portability/win32.hpp"
#endif

#ifdef __linux__
#include "./portability/linux.hpp"
#endif

#ifdef __APPLE__
#include "./portability/apple.hpp"
#endif

#ifndef BARRETENBERG_SRS_PATH
#define BARRETENBERG_SRS_PATH ""
#endif

#if 0
#define NO_MULTITHREADING 1
#endif

#if 0
#define USE_AVX 1
#endif

// TODO: PUT SOMEWHERE NICE
// Some hacky macros that allow us to parallelize iterating over a polynomial's point-evaluations
#ifndef NO_MULTITHREADING
#define ITERATE_OVER_DOMAIN_START(domain)                                                                              \
    _Pragma("omp parallel for") for (size_t j = 0; j < domain.num_threads; ++j)                                        \
    {                                                                                                                  \
        for (size_t i = (j * domain.thread_size); i < ((j + 1) * domain.thread_size); ++i) {

#define ITERATE_OVER_DOMAIN_END                                                                                        \
    }                                                                                                                  \
    }
#else
#define ITERATE_OVER_DOMAIN_START(domain) for (size_t i = 0; i < domain.size; ++i) {

#define ITERATE_OVER_DOMAIN_END }
#endif
