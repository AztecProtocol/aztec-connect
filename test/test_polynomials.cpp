#include <gtest/gtest.h>

#include <barretenberg/polynomials/polynomials.hpp>
#include <barretenberg/fields/fr.hpp>

using namespace barretenberg;

TEST(polynomials, evaluation_domain)
{
    size_t n = 256;
    polynomials::evaluation_domain domain = polynomials::evaluation_domain(n);

    EXPECT_EQ(domain.size, 256UL);
    EXPECT_EQ(domain.log2_size, 8UL);
}

TEST(polynomials, domain_roots)
{
    size_t n = 256;
    polynomials::evaluation_domain domain = polynomials::evaluation_domain(n);

    fr::field_t result;
    fr::field_t expected;
    fr::one(expected);
    fr::__pow_small(domain.root, n, result);

    EXPECT_EQ(fr::eq(result, expected), true);
}

TEST(polynomials, fft_with_small_degree)
{
    size_t n = 16;
    fr::field_t fft_transform[n];
    fr::field_t poly[n];

    for (size_t i = 0; i < n; ++i)
    {
        poly[i] = fr::random_element();
        fr::copy(poly[i], fft_transform[i]);
    }

    polynomials::evaluation_domain domain = polynomials::evaluation_domain(n);

    polynomials::fft(fft_transform, domain);

    fr::field_t work_root;
    fr::one(work_root);
    fr::field_t expected;
    for (size_t i = 0; i < n; ++i)
    {
        expected = polynomials::evaluate(poly, work_root, n);
        EXPECT_EQ(fr::eq(fft_transform[i], expected), true);
        fr::__mul(work_root, domain.root, work_root);
    }
}

TEST(polynomials, basic_fft)
{
    size_t n = 1 << 20;
    fr::field_t* data = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * n * 2);
    fr::field_t* result = &data[0];
    fr::field_t* expected = &data[n];
    for (size_t i = 0; i < n; ++i)
    {
        result[i] = fr::random_element();
        fr::copy(result[i], expected[i]);
    }

    polynomials::evaluation_domain domain = polynomials::evaluation_domain(n);

    polynomials::fft(result, domain);
    polynomials::ifft(result, domain);

    for (size_t i = 0; i < n; ++i)
    {
        EXPECT_EQ(fr::eq(result[i], expected[i]), true);
    }
    free(data);
}

TEST(polynomials, fft_ifft_consistency)
{
    size_t n = 256;
    fr::field_t result[n];
    fr::field_t expected[n];
    for (size_t i = 0; i < n; ++i)
    {
        result[i] = fr::random_element();
        fr::copy(result[i], expected[i]);
    }

    polynomials::evaluation_domain domain = polynomials::evaluation_domain(n);

    polynomials::fft(result, domain);
    polynomials::ifft(result, domain);

    for (size_t i = 0; i < n; ++i)
    {
        EXPECT_EQ(fr::eq(result[i], expected[i]), true);
    }
}

TEST(polynomials, fft_ifft_with_coset_consistency)
{
    size_t n = 256;
    fr::field_t result[n];
    fr::field_t expected[n];
    for (size_t i = 0; i < n; ++i)
    {
        result[i] = fr::random_element();
        fr::copy(result[i], expected[i]);
    }

    polynomials::evaluation_domain domain = polynomials::evaluation_domain(n);

    fr::field_t T0;
    fr::__mul(domain.generator, domain.generator_inverse, T0);
    EXPECT_EQ(fr::eq(T0, fr::one()), true);


    polynomials::fft_with_coset(result, domain);
    polynomials::ifft_with_coset(result, domain);

    for (size_t i = 0; i < n; ++i)
    {
        EXPECT_EQ(fr::eq(result[i], expected[i]), true);
    }
}

TEST(polynomials, fft_ifft_with_coset_cross_consistency)
{
    size_t n = 2;
    fr::field_t expected[n];
    fr::field_t poly_a[4 * n];
    fr::field_t poly_b[4 * n];
    fr::field_t poly_c[4 * n];

    for (size_t i = 0; i < n; ++i)
    {
        poly_a[i] = fr::random_element();
        fr::copy(poly_a[i], poly_b[i]);
        fr::copy(poly_a[i], poly_c[i]);
        fr::__add(poly_a[i], poly_c[i], expected[i]);
        fr::__add(expected[i], poly_b[i], expected[i]);
    }

    for (size_t i = n; i < 4 * n; ++i)
    {
        fr::zero(poly_a[i]);
        fr::zero(poly_b[i]);
        fr::zero(poly_c[i]);
    }
    polynomials::evaluation_domain small_domain = polynomials::evaluation_domain(n);
    polynomials::evaluation_domain mid_domain = polynomials::evaluation_domain(2 * n);
    polynomials::evaluation_domain large_domain = polynomials::evaluation_domain(4 * n);

    polynomials::fft_with_coset(poly_a, small_domain);
    polynomials::fft_with_coset(poly_b, mid_domain);
    polynomials::fft_with_coset(poly_c, large_domain);

    for (size_t i = 0; i < n; ++i)
    {
        fr::__add(poly_a[i], poly_c[4 * i], poly_a[i]);
        fr::__add(poly_a[i], poly_b[2 * i], poly_a[i]);
    }

    polynomials::ifft_with_coset(poly_a, small_domain);

    for (size_t i = 0; i < n; ++i)
    {
        EXPECT_EQ(fr::eq(poly_a[i], expected[i]), true);
    }
}

TEST(polynomials, compute_lagrange_polynomial_fft)
{
    size_t n = 256;
    polynomials::evaluation_domain small_domain = polynomials::evaluation_domain(n);
    polynomials::evaluation_domain mid_domain = polynomials::evaluation_domain(2 * n);

    fr::field_t l_1_coefficients[2 * n];
    fr::field_t scratch_memory[2 * n + 4];
    for (size_t i = 0; i < 2 * n; ++i)
    {
        fr::zero(l_1_coefficients[i]);
        fr::zero(scratch_memory[i]);
    }
    polynomials::compute_lagrange_polynomial_fft(l_1_coefficients, small_domain, mid_domain, scratch_memory);

    polynomials::copy_polynomial(l_1_coefficients, scratch_memory, 2 * n, 2 * n);

    polynomials::ifft_with_coset(l_1_coefficients, mid_domain);

    fr::field_t z = fr::random_element();
    fr::field_t shifted_z;
    fr::__mul(z, small_domain.root, shifted_z);
    fr::__mul(shifted_z, small_domain.root, shifted_z);

    fr::field_t eval;
    fr::field_t shifted_eval;

    eval = polynomials::evaluate(l_1_coefficients, shifted_z, small_domain.size);
    polynomials::fft(l_1_coefficients, small_domain);

    fr::copy(scratch_memory[0], scratch_memory[2 * n]);
    fr::copy(scratch_memory[1], scratch_memory[2 * n + 1]);
    fr::copy(scratch_memory[2], scratch_memory[2 * n + 2]);
    fr::copy(scratch_memory[3], scratch_memory[2 * n + 3]);
    fr::field_t *l_n_minus_one_coefficients = &scratch_memory[4];
    polynomials::ifft_with_coset(l_n_minus_one_coefficients, mid_domain);

    shifted_eval = polynomials::evaluate(l_n_minus_one_coefficients, z, small_domain.size);
    EXPECT_EQ(fr::eq(eval, shifted_eval), true);

    polynomials::fft(l_n_minus_one_coefficients, small_domain);

    EXPECT_EQ(fr::eq(l_1_coefficients[0], fr::one()), true);
  
    for (size_t i = 1; i < n; ++i)
    {
        EXPECT_EQ(fr::eq(l_1_coefficients[i], fr::zero()), true);
    }

    EXPECT_EQ(fr::eq(l_n_minus_one_coefficients[n-2], fr::one()), true);

    for (size_t i = 0; i < n; ++i)
    {
        if (i == (n - 2)) { continue; }
        EXPECT_EQ(fr::eq(l_n_minus_one_coefficients[i], fr::zero()), true);
    }
}

TEST(polynomials, divide_by_pseudo_vanishing_polynomial)
{
    size_t n = 256;
    fr::field_t a[4 * n];
    fr::field_t b[4 * n];
    fr::field_t c[4 * n];

    fr::field_t T0;
    for (size_t i = 0; i < n; ++i)
    {
        a[i] = fr::random_element();
        b[i] = fr::random_element();
        fr::__mul(a[i], b[i], c[i]);
        fr::neg(c[i], c[i]);
        fr::__mul(a[i], b[i], T0);
        fr::__add(T0, c[i], T0);

    }
    for (size_t i = n; i < 4 * n; ++i)
    {
        fr::zero(a[i]);
        fr::zero(b[i]);
        fr::zero(c[i]);
    }

    // make the final evaluation not vanish
    // fr::one(c[n-1]);
    polynomials::evaluation_domain small_domain = polynomials::evaluation_domain(n);
    polynomials::evaluation_domain mid_domain = polynomials::evaluation_domain(4 * n);

    polynomials::ifft(a, small_domain);
    polynomials::ifft(b, small_domain);
    polynomials::ifft(c, small_domain);

    polynomials::fft_with_coset(a, mid_domain);
    polynomials::fft_with_coset(b, mid_domain);
    polynomials::fft_with_coset(c, mid_domain);


    fr::field_t result[mid_domain.size];
    for (size_t i = 0; i < mid_domain.size; ++i)
    {
        fr::__mul(a[i], b[i], result[i]);
        fr::__add(result[i], c[i], result[i]);
    }

    polynomials::divide_by_pseudo_vanishing_polynomial(&result[0], small_domain, mid_domain);

    polynomials::ifft_with_coset(result, mid_domain);

    for (size_t i = n + 1; i < mid_domain.size; ++i)
    {
        
        EXPECT_EQ(fr::eq(result[i], fr::zero()), true);
    }

}

TEST(polynomials, compute_kate_opening_coefficients)
{
    // generate random polynomial F(X) = coeffs
    size_t n = 256;
    fr::field_t coeffs[2 * n];
    fr::field_t W[2 * n];
    for (size_t i = 0; i < n; ++i)
    {
        coeffs[i] = fr::random_element();
        fr::zero(coeffs[i + n]);
    }
    polynomials::copy_polynomial(coeffs, W, 2 * n, 2 * n);

    // generate random evaluation point z
    fr::field_t z = fr::random_element();

    // compute opening polynomial W(X), and evaluation f = F(z)
    fr::field_t f = polynomials::compute_kate_opening_coefficients(W, z, n);

    // validate that W(X)(X - z) = F(X) - F(z)
    // compute (X - z) in coefficient form
    fr::field_t multiplicand[2 * n];
    fr::neg(z, multiplicand[0]);
    fr::one(multiplicand[1]);
    for (size_t i = 2; i < 2 * n; ++i)
    {
        fr::zero(multiplicand[i]);
    }

    // set F(X) = F(X) - F(z)
    fr::__sub(coeffs[0], f, coeffs[0]);

    // compute fft of polynomials
    polynomials::evaluation_domain domain = polynomials::evaluation_domain(2 * n);
    polynomials::fft_with_coset(coeffs, domain);
    polynomials::fft_with_coset(W, domain);
    polynomials::fft_with_coset(multiplicand, domain);

    // validate that, at each evaluation, W(X)(X - z) = F(X) - F(z)
    fr::field_t result;
    for (size_t i = 0; i < domain.size; ++i)
    {
        fr::__mul(W[i], multiplicand[i], result);
        EXPECT_EQ(fr::eq(result, coeffs[i]), true);
    }
}

TEST(polynomials, get_lagrange_evaluations)
{
    size_t n = 16;
    
    polynomials::evaluation_domain domain = polynomials::evaluation_domain(n);

    fr::field_t z = fr::random_element();

    polynomials::lagrange_evaluations evals = polynomials::get_lagrange_evaluations(z, domain);

    fr::field_t vanishing_poly[2 * n];
    fr::field_t l_1_poly[n];
    fr::field_t l_n_minus_1_poly[n];

    for (size_t i = 0; i < n; ++i)
    {
        fr::zero(l_1_poly[i]);
        fr::zero(l_n_minus_1_poly[i]);
        fr::zero(vanishing_poly[i]);
    }
    fr::one(l_1_poly[0]);
    fr::one(l_n_minus_1_poly[n-2]);

    fr::field_t n_mont{{ n, 0, 0, 0 } };
    fr::__to_montgomery_form(n_mont, n_mont);
    fr::__mul(n_mont, domain.root, vanishing_poly[n-1]);

    polynomials::ifft(l_1_poly, domain);
    polynomials::ifft(l_n_minus_1_poly, domain);
    polynomials::ifft(vanishing_poly, domain);

    fr::field_t l_1_expected;
    fr::field_t l_n_minus_1_expected;
    fr::field_t vanishing_poly_expected;
    l_1_expected = polynomials::evaluate(l_1_poly, z, n);
    l_n_minus_1_expected = polynomials::evaluate(l_n_minus_1_poly, z, n);
    vanishing_poly_expected = polynomials::evaluate(vanishing_poly, z, n);
    EXPECT_EQ(fr::eq(evals.l_1, l_1_expected), true);
    EXPECT_EQ(fr::eq(evals.l_n_minus_1, l_n_minus_1_expected), true);
    EXPECT_EQ(fr::eq(evals.vanishing_poly, vanishing_poly_expected), true);
}