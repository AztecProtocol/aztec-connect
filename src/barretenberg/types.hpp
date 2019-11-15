#pragma once

#include "stddef.h"
#include "stdint.h"
#include "stdlib.h"
#include <vector>

// TODO: WARNING! getentropy is using rand()! Should probably be called dontgetentropy()!
#ifdef _WIN32
#define PRIx64 "llx"
#define PRIu64 "llu"
inline void* aligned_alloc(size_t alignment, size_t size)
{
    return _aligned_malloc(size, alignment);
}
#define aligned_free _aligned_free
inline int getentropy(void* buf, size_t size)
{
    for (size_t i = 0; i < size; ++i)
    {
        ((char*)buf)[i] = (char)rand();
    }
    return 0;
}
#else
#define aligned_free free
#endif

#ifdef __APPLE__
#include <sys/random.h>
inline void* aligned_alloc(size_t alignment, size_t size)
{
    void* t = 0;
    posix_memalign(&t, alignment, size);
    return t;
}
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
        for (size_t i = (j * domain.thread_size); i < ((j + 1) * domain.thread_size); ++i)                             \
        {

#define ITERATE_OVER_DOMAIN_END                                                                                        \
    }                                                                                                                  \
    }
#else
#define ITERATE_OVER_DOMAIN_START(domain)                                                                              \
    for (size_t i = 0; i < domain.size; ++i)                                                                           \
    {

#define ITERATE_OVER_DOMAIN_END }
#endif

namespace barretenberg
{
namespace fq
{
struct field_t
{
    alignas(32) uint64_t data[4];
};

struct field_wide_t
{
    alignas(64) uint64_t data[8];
};
} // namespace fq

namespace fr
{
struct field_t
{
    alignas(32) uint64_t data[4];
};

struct field_wide_t
{
    alignas(64) uint64_t data[8];
};
} // namespace fr

namespace fq2
{
struct fq2_t
{
    fq::field_t c0;
    fq::field_t c1;
};
} // namespace fq2

namespace fq6
{
struct fq6_t
{
    fq2::fq2_t c0;
    fq2::fq2_t c1;
    fq2::fq2_t c2;
};
} // namespace fq6

namespace fq12
{
struct fq12_t
{
    fq6::fq6_t c0;
    fq6::fq6_t c1;
};
} // namespace fq12

namespace pairing
{
struct ell_coeffs
{
    fq2::fq2_t o;
    fq2::fq2_t vw;
    fq2::fq2_t vv;
};
} // namespace pairing

namespace g1
{
struct affine_element
{
    fq::field_t x;
    fq::field_t y;
};

struct element
{
    fq::field_t x;
    fq::field_t y;
    fq::field_t z;
};
} // namespace g1

namespace g2
{
struct affine_element
{
    fq2::fq2_t x;
    fq2::fq2_t y;
};

struct element
{
    fq2::fq2_t x;
    fq2::fq2_t y;
    fq2::fq2_t z;
};
} // namespace g2

namespace polynomials
{

// TODO: move this into polynomials.hpp
// TODO: fix move constructor
// TODO: use shared_ptr for lookup table
class evaluation_domain
{
  public:
    fr::field_t root;
    fr::field_t root_inverse;
    fr::field_t generator;
    fr::field_t generator_inverse;
    fr::field_t domain;
    fr::field_t domain_inverse;
    size_t size;
    size_t log2_size;
    size_t num_threads;
    size_t thread_size;
    size_t log2_thread_size;
    size_t log2_num_threads;

    fr::field_t** round_roots;
    fr::field_t* roots;
    fr::field_t** inverse_round_roots;
    fr::field_t* inverse_roots;

    evaluation_domain() : round_roots(nullptr), roots(nullptr), inverse_round_roots(nullptr), inverse_roots(nullptr){};
    evaluation_domain(size_t size, bool skip_roots = false);
    evaluation_domain(const evaluation_domain& other);
    // evaluation_domain(evaluation_domain &&other) = delete;
    ~evaluation_domain();
};

struct lagrange_evaluations
{
    fr::field_t vanishing_poly;
    fr::field_t l_1;
    fr::field_t l_n_minus_1;
};
} // namespace polynomials
} // namespace barretenberg

namespace waffle
{
// contains the state of a PLONK proof, including witness values, instance values
// and Kate polynomial commitments
// TODO: add proper constructors, copy constructors, destructor

struct plonk_challenges
{
    barretenberg::fr::field_t beta;
    barretenberg::fr::field_t gamma;
    barretenberg::fr::field_t alpha;
    barretenberg::fr::field_t z;
    barretenberg::fr::field_t nu;
};

struct plonk_proof
{
    // Kate polynomial commitments required for a proof of knowledge
    barretenberg::g1::affine_element W_L;
    barretenberg::g1::affine_element W_R;
    barretenberg::g1::affine_element W_O;
    barretenberg::g1::affine_element Z_1;
    barretenberg::g1::affine_element T_LO;
    barretenberg::g1::affine_element T_MID;
    barretenberg::g1::affine_element T_HI;
    barretenberg::g1::affine_element PI_Z;
    barretenberg::g1::affine_element PI_Z_OMEGA;

    barretenberg::fr::field_t w_l_eval;
    barretenberg::fr::field_t w_r_eval;
    barretenberg::fr::field_t w_o_eval;
    barretenberg::fr::field_t sigma_1_eval;
    barretenberg::fr::field_t sigma_2_eval;
    barretenberg::fr::field_t z_1_shifted_eval;
    barretenberg::fr::field_t linear_eval;

    barretenberg::fr::field_t w_l_shifted_eval;
    barretenberg::fr::field_t w_r_shifted_eval;
    barretenberg::fr::field_t w_o_shifted_eval;
    barretenberg::fr::field_t q_c_eval;
    barretenberg::fr::field_t q_mimc_coefficient_eval;
    std::vector<barretenberg::fr::field_t> custom_gate_evaluations;
};
} // namespace waffle