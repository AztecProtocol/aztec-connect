#ifndef POLYNOMIAL_ARITHMETIC_HPP
#define POLYNOMIAL_ARITHMETIC_HPP

#include "./evaluation_domain.hpp"
#include "../assert.hpp"
#include "../types.hpp"

#ifndef NO_MULTITHREADING
#include <omp.h>
#endif

namespace barretenberg
{
namespace polynomial_arithmetic
{
struct lagrange_evaluations
{
    fr::field_t vanishing_poly;
    fr::field_t l_1;
    fr::field_t l_n_minus_1;
};

fr::field_t evaluate(const fr::field_t *coeffs, const fr::field_t &z, const size_t n);
void copy_polynomial(fr::field_t *src, fr::field_t *dest, size_t num_src_coefficients, size_t num_target_coefficients);

//  2. Compute a lookup table of the roots of unity, and suffer through cache misses from nonlinear access patterns
void fft_inner_serial(fr::field_t *coeffs, const size_t domain_size, const std::vector<fr::field_t*>& root_table);
void fft_inner_parallel(fr::field_t *coeffs, const evaluation_domain &domain, const fr::field_t &, const std::vector<fr::field_t*> &root_table);

void fft(fr::field_t *coeffs, const evaluation_domain &domain);
void fft_with_constant(fr::field_t *coeffs, const evaluation_domain &domain, const fr::field_t &value);

void coset_fft(fr::field_t *coeffs, const evaluation_domain &domain);

void coset_fft_with_constant(fr::field_t *coeffs, const evaluation_domain &domain, const fr::field_t &constant);

void ifft(fr::field_t *coeffs, const evaluation_domain &domain);

void ifft_with_constant(fr::field_t *coeffs, const evaluation_domain &domain, const fr::field_t &value);

void coset_ifft(fr::field_t *coeffs, const evaluation_domain &domain);

void add(const fr::field_t *a_coeffs, const fr::field_t *b_coeffs, fr::field_t *r_coeffs, const evaluation_domain &domain);

void mul(const fr::field_t *a_coeffs, const fr::field_t *b_coeffs, fr::field_t *r_coeffs, const evaluation_domain &domain);

// For L_1(X) = (X^{n} - 1 / (X - 1)) * (1 / n)
// Compute the 2n-fft of L_1(X)
// We can use this to compute the 2n-fft evaluations of any L_i(X).
// We can consider `l_1_coefficients` to be a 2n-sized vector of the evaluations of L_1(X),
// for all X = 2n'th roots of unity.
// To compute the vector for the 2n-fft transform of L_i(X), we perform a (2i)-left-shift of this vector
void compute_lagrange_polynomial_fft(fr::field_t *l_1_coefficients, const evaluation_domain &src_domain, const evaluation_domain &target_domain);

void divide_by_pseudo_vanishing_polynomial(fr::field_t *coeffs, const evaluation_domain &src_domain, const evaluation_domain &target_domain);

fr::field_t compute_kate_opening_coefficients(const fr::field_t *src, fr::field_t *dest, const fr::field_t &z, const size_t n);

// compute Z_H*(z), l_1(z), l_{n-1}(z)
lagrange_evaluations get_lagrange_evaluations(const fr::field_t &z, const evaluation_domain &domain);

// Convert an fft with `current_size` point evaluations, to one with `current_size >> compress_factor` point evaluations
void compress_fft(const fr::field_t *src, fr::field_t *dest, const size_t current_size, const size_t compress_factor);
} // namespace polynomials
} // namespace barretenberg

#endif