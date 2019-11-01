#ifndef TYPES
#define TYPES

#include "stdint.h"
#include "stddef.h"
#include "stdlib.h"
#include <sys/random.h>

inline void *aligned_alloc(size_t alignment, size_t size)
{
    void *t;
    posix_memalign(&t, alignment, size);
    return t;
}

#ifndef BARRETENBERG_SRS_PATH
#define BARRETENBERG_SRS_PATH ""
#endif

#if 0
#define NO_MULTITHREADING 1
#endif

#if 0
#define USE_AVX
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
struct evaluation_domain
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

    fr::field_t **round_roots;
    fr::field_t *roots;
    fr::field_t **inverse_round_roots;
    fr::field_t *inverse_roots;

    evaluation_domain() : round_roots(nullptr), roots(nullptr), inverse_round_roots(nullptr), inverse_roots(nullptr){};
    evaluation_domain(size_t size, bool skip_roots = false);
    evaluation_domain(const evaluation_domain &other);
    evaluation_domain(evaluation_domain &&other) = delete;
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

namespace srs
{
struct plonk_srs
{
    barretenberg::g1::affine_element *monomials;
    barretenberg::g2::affine_element SRS_T2;
    size_t degree;
};
} // namespace srs

namespace waffle
{
struct circuit_instance
{
    barretenberg::g1::affine_element Q_M;
    barretenberg::g1::affine_element Q_L;
    barretenberg::g1::affine_element Q_R;
    barretenberg::g1::affine_element Q_O;
    barretenberg::g1::affine_element Q_C;
    barretenberg::g1::affine_element SIGMA_1;
    barretenberg::g1::affine_element SIGMA_2;
    barretenberg::g1::affine_element SIGMA_3;
    barretenberg::g1::affine_element S_ID;
    size_t n;
};

struct plonk_challenges
{
    barretenberg::fr::field_t beta;
    barretenberg::fr::field_t gamma;
    barretenberg::fr::field_t alpha;
    barretenberg::fr::field_t z;
    barretenberg::fr::field_t nu;
};

// contains the state of a PLONK proof, including witness values, instance values
// and Kate polynomial commitments
// TODO: add proper constructors, copy constructors, destructor
struct circuit_state
{
    plonk_challenges challenges;
    barretenberg::fr::field_t alpha_squared;
    barretenberg::fr::field_t alpha_cubed;

    // pointers to witness vectors. Originally these are in Lagrange-base form,
    // during the course of proof construction, are replaced by their coefficient form
    barretenberg::fr::field_t *w_l;
    barretenberg::fr::field_t *w_r;
    barretenberg::fr::field_t *w_o;
    barretenberg::fr::field_t *z_1;
    barretenberg::fr::field_t *z_2;
    barretenberg::fr::field_t *t;
    barretenberg::fr::field_t *linear_poly;

    // pointers to instance vectors. Originally in Lagrange-base form,
    // will be converted into coefficient form
    barretenberg::fr::field_t *q_c;
    barretenberg::fr::field_t *q_m;
    barretenberg::fr::field_t *q_l;
    barretenberg::fr::field_t *q_r;
    barretenberg::fr::field_t *q_o;
    barretenberg::fr::field_t *sigma_1;
    barretenberg::fr::field_t *sigma_2;
    barretenberg::fr::field_t *sigma_3;

    barretenberg::fr::field_t *product_1;
    barretenberg::fr::field_t *product_2;
    barretenberg::fr::field_t *product_3;
    barretenberg::fr::field_t *permutation_product;

    barretenberg::fr::field_t *w_l_lagrange_base;
    barretenberg::fr::field_t *w_r_lagrange_base;
    barretenberg::fr::field_t *w_o_lagrange_base;

    uint32_t *sigma_1_mapping;
    uint32_t *sigma_2_mapping;
    uint32_t *sigma_3_mapping;
    size_t n;

    barretenberg::polynomials::evaluation_domain small_domain;
    barretenberg::polynomials::evaluation_domain mid_domain;
    barretenberg::polynomials::evaluation_domain large_domain;

    circuit_state(size_t n);
    circuit_state(const circuit_state &other);
};

struct witness_ffts
{
    barretenberg::fr::field_t *w_l_large;
    barretenberg::fr::field_t *w_r_large;
    barretenberg::fr::field_t *w_o_large;
    barretenberg::fr::field_t *w_l_mid;
    barretenberg::fr::field_t *w_r_mid;
    barretenberg::fr::field_t *w_o_mid;
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
};
} // namespace waffle

#endif