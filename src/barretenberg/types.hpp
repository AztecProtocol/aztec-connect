#pragma once

#include "stdint.h"
#include "stddef.h"

#if 0
#define NO_MULTITHREADING 1
#endif

namespace fq
{
struct field_t
{
    alignas(32) uint64_t data[4];
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
struct evaluation_domain
{
    size_t size;
    size_t log2_size;
    fr::field_t root;
    fr::field_t root_inverse;
    fr::field_t generator;
    fr::field_t generator_inverse;
    fr::field_t domain;
    fr::field_t domain_inverse;
    size_t num_threads;
    size_t thread_size;
    size_t log2_thread_size;
    size_t log2_num_threads;
};

struct lagrange_evaluations
{
    fr::field_t vanishing_poly;
    fr::field_t l_1;
    fr::field_t l_n_minus_1;
};
} // namespace polynomials

namespace srs
{
struct plonk_srs
{
    g1::affine_element *monomials;
    g2::affine_element SRS_T2;
    size_t degree;
};
} // namespace srs

namespace waffle
{
struct circuit_instance
{
    g1::affine_element Q_M;
    g1::affine_element Q_L;
    g1::affine_element Q_R;
    g1::affine_element Q_O;
    g1::affine_element Q_C;
    g1::affine_element SIGMA_1;
    g1::affine_element SIGMA_2;
    g1::affine_element SIGMA_3;
    g1::affine_element S_ID;
    size_t n;
};

struct plonk_challenges
{
    fr::field_t beta;
    fr::field_t gamma;
    fr::field_t alpha;
    fr::field_t z;
    fr::field_t nu;
};

// contains the state of a PLONK proof, including witness values, instance values
// and Kate polynomial commitments
struct circuit_state
{
    plonk_challenges challenges;
    fr::field_t alpha_squared;
    fr::field_t alpha_cubed;

    // pointers to witness vectors. Originally these are in Lagrange-base form,
    // during the course of proof construction, are replaced by their coefficient form
    fr::field_t *w_l;
    fr::field_t *w_r;
    fr::field_t *w_o;
    fr::field_t *z_1;
    fr::field_t *z_2;
    fr::field_t *t;
    fr::field_t *linear_poly;

    // pointers to instance vectors. Originally in Lagrange-base form,
    // will be converted into coefficient form
    fr::field_t *q_c;
    fr::field_t *q_m;
    fr::field_t *q_l;
    fr::field_t *q_r;
    fr::field_t *q_o;
    fr::field_t *sigma_1;
    fr::field_t *sigma_2;
    fr::field_t *sigma_3;
    fr::field_t *s_id;

    fr::field_t *product_1;
    fr::field_t *product_2;
    fr::field_t *product_3;
    fr::field_t *permutation_product;

    fr::field_t *w_l_lagrange_base;
    fr::field_t *w_r_lagrange_base;
    fr::field_t *w_o_lagrange_base;
    size_t n;

    polynomials::evaluation_domain small_domain;
    polynomials::evaluation_domain mid_domain;
    polynomials::evaluation_domain large_domain;
};

struct plonk_proof
{
    // Kate polynomial commitments required for a proof of knowledge
    g1::affine_element W_L;
    g1::affine_element W_R;
    g1::affine_element W_O;
    g1::affine_element Z_1;
    g1::affine_element Z_2;
    g1::affine_element T;
    g1::affine_element PI_Z;
    g1::affine_element PI_Z_OMEGA;

    fr::field_t w_l_eval;
    fr::field_t w_r_eval;
    fr::field_t w_o_eval;
    fr::field_t s_id_eval;
    fr::field_t sigma_1_eval;
    fr::field_t sigma_2_eval;
    fr::field_t sigma_3_eval;
    fr::field_t t_eval;
    fr::field_t z_1_shifted_eval;
    fr::field_t z_2_shifted_eval;
    fr::field_t linear_eval;
};

} // namespace waffle