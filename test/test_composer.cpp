#include <gtest/gtest.h>

#include <barretenberg/fields/fr.hpp>

#include <barretenberg/io/io.hpp>
#include <barretenberg/groups/g1.hpp>
#include <barretenberg/waffle/waffle.hpp>
#include <barretenberg/waffle/preprocess.hpp>
#include <barretenberg/waffle/verifier.hpp>
#include <barretenberg/waffle/composer/composer.hpp>

using namespace barretenberg;

namespace
{
void generate_test_data(waffle::Composer *composer)
{
    fr::field_t a = fr::random_element();
    fr::field_t b = fr::random_element();
    fr::field_t c = fr::add(a, b);
    // fr::field_t d = fr::mul(a, c);
    size_t a_idx = composer->add_variable(a);
    size_t b_idx = composer->add_variable(b);
    size_t c_idx = composer->add_variable(c);
    // size_t d_idx = composer->add_variable(d);
    printf("a1\n");
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    printf("a2\n");
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    printf("ax\n");
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    printf("ay\n");
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    printf("ay2\n");
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    printf("ay3\n");
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    printf("az\n");
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);
    printf("penultimate\n");
    composer->add_basic_add_gate(a_idx, b_idx, c_idx);

    // composer.add_basic_mul_gate(a_idx, c_idx, d_idx);
    // composer.add_basic_add_gate(a_idx, b_idx, c_idx);
    // composer.add_basic_mul_gate(a_idx, c_idx, d_idx);
    // composer.add_basic_add_gate(a_idx, b_idx, c_idx);
    // composer.add_basic_mul_gate(a_idx, c_idx, d_idx);
    // composer.add_basic_add_gate(a_idx, b_idx, c_idx);
    // composer.add_basic_mul_gate(a_idx, c_idx, d_idx);
    // composer.add_basic_add_gate(a_idx, b_idx, c_idx);
    // composer.add_basic_mul_gate(a_idx, c_idx, d_idx);
    // composer.add_basic_add_gate(a_idx, b_idx, c_idx);
    // composer.add_basic_mul_gate(a_idx, c_idx, d_idx);
    // composer.add_basic_add_gate(a_idx, b_idx, c_idx);
    // composer.add_basic_mul_gate(a_idx, c_idx, d_idx);
    // composer.add_basic_add_gate(a_idx, b_idx, c_idx);
    // composer.add_basic_mul_gate(a_idx, c_idx, d_idx);
    printf("returning\n");
}
} // namespace
TEST(composer, composer)
{
    printf("a\n");
    srs::plonk_srs srs;
    srs.degree = 32;
    srs.monomials = (g1::affine_element*)(aligned_alloc(32, sizeof(g1::affine_element) * (2 * 32 + 2)));
    io::read_transcript(srs, "../srs_db/transcript.dat");
    scalar_multiplication::generate_pippenger_point_table(srs.monomials, srs.monomials, 32 * 2);

    printf("b\n");
    std::vector<fr::field_t> foo;
    foo.push_back(fr::one());
    printf("c\n");
    waffle::Composer* composer = new waffle::Composer();    
    fr::field_t* scratch_memory = (barretenberg::fr::field_t *)aligned_alloc(32, sizeof(barretenberg::fr::field_t) * (1 << 8));
    printf("d\n");
    generate_test_data(composer);
    printf("e\n");
    waffle::circuit_state state = composer->compute_witness(foo, scratch_memory);
    printf("c\n");
    size_t n = state.n;
    printf("n = %lu\n", state.n);

    for (size_t i = 0; i < n; ++i)
    {
        state.sigma_1_mapping[i] = (uint32_t)i;
        state.sigma_2_mapping[i] = (uint32_t)i + (1U << 30U);
        state.sigma_3_mapping[i] = (uint32_t)i + (1U << 31U);
    }
    for(size_t i = 0; i < state.n; ++i)
    {
        printf("i = %lu, sig1 = %x, sig2 = %x, sig3 = %x\n", i, state.sigma_1_mapping[i], state.sigma_2_mapping[i], state.sigma_3_mapping[i]);
    }

    printf("w_l\n");
    polynomials::print_polynomial(state.w_l, state.n);
    printf("w_r\n");
    polynomials::print_polynomial(state.w_r, state.n);
    printf("w_o\n");
    polynomials::print_polynomial(state.w_o, state.n);
    printf("q_m\n");
    polynomials::print_polynomial(state.q_m, state.n);
    printf("q_l\n");
    polynomials::print_polynomial(state.q_l, state.n);
    printf("q_r\n");
    polynomials::print_polynomial(state.q_r, state.n);
    printf("q_o\n");
    polynomials::print_polynomial(state.q_o, state.n);
    printf("q_c\n");
    polynomials::print_polynomial(state.q_c, state.n);

    fr::field_t bar = fr::add(state.q_l[0], state.q_o[0]);
    printf("bar\n");
    fr::print(bar);
        // load structured reference string from disk

    for (size_t i = 0; i < state.n; ++i)
    {
        fr::field_t t0 = fr::mul(state.q_l[i], state.w_l[i]);
        fr::field_t t1 = fr::mul(state.q_r[i], state.w_r[i]);
        fr::field_t t2 = fr::mul(state.q_o[i], state.w_o[i]);
        fr::field_t t3 = fr::add(t0, t1);
        fr::field_t t4 = fr::add(t3, t2);
        fr::field_t t5 = fr::mul(state.w_l[i], state.w_r[i]);
        fr::field_t t6 = fr::mul(t5, state.q_m[i]);
        t4 = fr::add(t4, t6);
        printf("t4 = ");
        fr::print(t4);
    }
    // process circuit
    waffle::circuit_instance instance = waffle::preprocess_circuit(state, srs);
    // waffle::convert_permutations_into_lagrange_base_form(state);
    
    //     waffle::fft_pointers ffts;
    // fr::field_t* scratch_space = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (70 * n + 8)));
    // ffts.scratch_memory = scratch_space;
    // waffle::plonk_proof proof;

    // waffle::compute_quotient_polynomial(state, ffts, proof, srs);
    // state.challenges.z = fr::random_element();

    // fr::field_t t_eval = polynomials::evaluate(ffts.quotient_poly, state.challenges.z, 3 * n);
    // state.linear_poly = &ffts.scratch_memory[4 * n];

    // waffle::compute_linearisation_coefficients(state, ffts, proof);

    // polynomials::lagrange_evaluations lagrange_evals = polynomials::get_lagrange_evaluations(state.challenges.z, state.small_domain);

    // fr::field_t alpha_five;
    // fr::field_t alpha_six;
    // fr::__mul(state.alpha_squared, state.alpha_cubed, alpha_five);
    // fr::__mul(alpha_five, state.challenges.alpha, alpha_six);
    // fr::field_t rhs;
    // fr::field_t lhs;
    // fr::field_t T0;
    // fr::field_t T1;
    // fr::field_t T2;

    // fr::__mul(lagrange_evals.l_n_minus_1, state.alpha_cubed, T0);
    // fr::__mul(T0, state.challenges.alpha, T0);

    // fr::__sub(proof.z_1_shifted_eval, proof.z_2_shifted_eval, T1);
    // fr::__mul(T0, T1, T0);

    // fr::__add(alpha_five, alpha_six, T2);
    // fr::__mul(T2, lagrange_evals.l_1, T2);
    // fr::__sub(T0, T2, T0);

    // fr::__mul(proof.z_1_shifted_eval, state.alpha_squared, T1);
    // fr::__mul(proof.z_2_shifted_eval, state.alpha_cubed, T2);
    // fr::__add(T1, T2, T1);
    // fr::__sub(T0, T1, T0);
    // fr::__add(T0, proof.linear_eval, rhs);

    // fr::__mul(t_eval, lagrange_evals.vanishing_poly, lhs);

    // EXPECT_EQ(fr::eq(lhs, rhs), true);


    // construct proof
    waffle::plonk_proof proof = waffle::construct_proof(state, srs);

    fq2::print(srs.SRS_T2.x);
    fq2::print(srs.SRS_T2.y);
    // verify proof
    bool result = waffle::verifier::verify_proof(proof, instance, srs.SRS_T2);
    EXPECT_EQ(result, true);

    free(srs.monomials);
    free(scratch_memory);
}


void generate_test_data(waffle::circuit_state& state, fr::field_t* data)
{
    size_t n = state.n;
    state.small_domain = polynomials::evaluation_domain(n);
    state.mid_domain = polynomials::evaluation_domain(2 * n);
    state.large_domain = polynomials::evaluation_domain(4 * n);
    state.w_l = &data[0];
    state.w_r = &data[n];
    state.w_o = &data[2 * n];
    state.z_1 = &data[3 * n];
    state.z_2 = &data[4 * n + 1];
    state.q_c = &data[5 * n + 2];
    state.q_l = &data[6 * n + 2];
    state.q_r = &data[7 * n + 2];
    state.q_o = &data[8 * n + 2];
    state.q_m = &data[9 * n + 2];
    state.sigma_1 = &data[10 * n + 2];
    state.sigma_2 = &data[11 * n + 2];
    state.sigma_3 = &data[12 * n + 2];
    state.sigma_1_mapping = (uint32_t*)&data[13 * n + 2];
    state.sigma_2_mapping = (uint32_t*)((uintptr_t)&data[13 * n + 2] + (uintptr_t)(n * sizeof(uint32_t)));
    state.sigma_3_mapping = (uint32_t*)((uintptr_t)&data[13 * n + 2] + (uintptr_t)((2 * n) * sizeof(uint32_t)));
    state.t = &data[14 * n + 2];

    state.w_l_lagrange_base = state.t;
    state.w_r_lagrange_base = &state.t[n + 1];
    state.w_o_lagrange_base = &state.t[2 * n + 2];

    // create some constraints that satisfy our arithmetic circuit relation
    fr::field_t one;
    fr::field_t zero;
    fr::field_t minus_one;
    fr::one(one);
    fr::neg(one, minus_one);
    fr::zero(zero);
    fr::field_t T0;
    fr::field_t T1;
    fr::field_t T2;
    // even indices = mul gates, odd incides = add gates
    // make selector polynomials / wire values randomly distributed (subject to gate constraints)
    fr::field_t q_m_seed = fr::random_element();
    fr::field_t q_l_seed = fr::random_element();
    fr::field_t q_r_seed = fr::random_element();
    fr::field_t q_o_seed = fr::random_element();
    fr::field_t q_c_seed = fr::random_element();
    fr::field_t w_l_seed = fr::random_element();
    fr::field_t w_r_seed = fr::random_element();
    fr::field_t q_m_acc;
    fr::field_t q_l_acc;
    fr::field_t q_r_acc;
    fr::field_t q_o_acc;
    fr::field_t q_c_acc;
    fr::field_t w_l_acc;
    fr::field_t w_r_acc;
    fr::copy(q_m_seed, q_m_acc);
    fr::copy(q_l_seed, q_l_acc);
    fr::copy(q_r_seed, q_r_acc);
    fr::copy(q_o_seed, q_o_acc);
    fr::copy(q_c_seed, q_c_acc);
    fr::copy(w_l_seed, w_l_acc);
    fr::copy(w_r_seed, w_r_acc);

    for (size_t i = 0; i < n / 2; i += 2)
    {
        fr::copy(q_m_acc, state.q_m[i]);
        // fr::copy(fr::zero(), state.q_l[i]);
        // fr::copy(fr::zero(), state.q_r[i]);
        fr::copy(q_l_acc, state.q_l[i]);
        fr::copy(q_r_acc, state.q_r[i]);
        fr::copy(q_o_acc, state.q_o[i]);
        fr::copy(q_c_acc, state.q_c[i]);
        fr::copy(w_l_acc, state.w_l[i]);
        fr::copy(w_r_acc, state.w_r[i]);
        fr::copy(state.q_o[i], state.w_o[i]);

        fr::__mul(q_m_acc, q_m_seed, q_m_acc);
        fr::__mul(q_l_acc, q_l_seed, q_l_acc);
        fr::__mul(q_r_acc, q_r_seed, q_r_acc);
        fr::__mul(q_o_acc, q_o_seed, q_o_acc);
        fr::__mul(q_c_acc, q_c_seed, q_c_acc);
        fr::__mul(w_l_acc, w_l_seed, w_l_acc);
        fr::__mul(w_r_acc, w_r_seed, w_r_acc);

        // fr::copy(fr::zero(), state.q_m[i + 1]);
        fr::copy(q_m_acc, state.q_m[i + 1]);
        fr::copy(q_l_acc, state.q_l[i + 1]);
        fr::copy(q_r_acc, state.q_r[i + 1]);
        fr::copy(q_o_acc, state.q_o[i + 1]);
        fr::copy(q_c_acc, state.q_c[i + 1]);
        fr::copy(w_l_acc, state.w_l[i + 1]);
        fr::copy(w_r_acc, state.w_r[i + 1]);
        fr::copy(state.q_o[i + 1], state.w_o[i + 1]);

        fr::__mul(q_m_acc, q_m_seed, q_m_acc);
        fr::__mul(q_l_acc, q_l_seed, q_l_acc);
        fr::__mul(q_r_acc, q_r_seed, q_r_acc);
        fr::__mul(q_o_acc, q_o_seed, q_o_acc);
        fr::__mul(q_c_acc, q_c_seed, q_c_acc);
        fr::__mul(w_l_acc, w_l_seed, w_l_acc);
        fr::__mul(w_r_acc, w_r_seed, w_r_acc);
    }

    fr::batch_invert(state.w_o, n / 2);

    for (size_t i = 0; i < n / 2; ++i)
    {
        fr::__mul(state.q_l[i], state.w_l[i], T0);
        fr::__mul(state.q_r[i], state.w_r[i], T1);
        fr::__mul(state.w_l[i], state.w_r[i], T2);
        fr::__mul(T2, state.q_m[i], T2);
        fr::__add(T0, T1, T0);
        fr::__add(T0, T2, T0);
        fr::__add(T0, state.q_c[i], T0);
        fr::neg(T0, T0);
        fr::__mul(state.w_o[i], T0, state.w_o[i]);
    }
    size_t shift = n / 2;
    polynomials::copy_polynomial(state.w_l, state.w_l + shift, shift, shift);
    polynomials::copy_polynomial(state.w_r, state.w_r + shift, shift, shift);
    polynomials::copy_polynomial(state.w_o, state.w_o + shift, shift, shift);
    polynomials::copy_polynomial(state.q_m, state.q_m + shift, shift, shift);
    polynomials::copy_polynomial(state.q_l, state.q_l + shift, shift, shift);
    polynomials::copy_polynomial(state.q_r, state.q_r + shift, shift, shift);
    polynomials::copy_polynomial(state.q_o, state.q_o + shift, shift, shift);
    polynomials::copy_polynomial(state.q_c, state.q_c + shift, shift, shift);

    // create basic permutation - second half of witness vector is a copy of the first half
    for (size_t i = 0; i < n / 2; ++i)
    {
        state.sigma_1_mapping[shift + i] = (uint32_t)i;
        state.sigma_2_mapping[shift + i] = (uint32_t)i + (1U << 30U);
        state.sigma_3_mapping[shift + i] = (uint32_t)i + (1U << 31U);
        state.sigma_1_mapping[i] = (uint32_t)(i + shift);
        state.sigma_2_mapping[i] = (uint32_t)(i + shift) + (1U << 30U);
        state.sigma_3_mapping[i] = (uint32_t)(i + shift) + (1U << 31U);
    }

    fr::zero(state.w_l[n-1]);
    fr::zero(state.w_r[n-1]);
    fr::zero(state.w_o[n-1]);
    fr::zero(state.q_c[n-1]);
    fr::zero(state.w_l[shift-1]);
    fr::zero(state.w_r[shift-1]);
    fr::zero(state.w_o[shift-1]);
    fr::zero(state.q_c[shift-1]);
    fr::zero(state.q_m[shift-1]);
    fr::zero(state.q_l[shift-1]);
    fr::zero(state.q_r[shift-1]);
    fr::zero(state.q_o[shift-1]);
    // make last permutation the same as identity permutation
    state.sigma_1_mapping[shift - 1] = (uint32_t)shift - 1;
    state.sigma_2_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 30U);
    state.sigma_3_mapping[shift - 1] = (uint32_t)shift - 1 + (1U << 31U);
    state.sigma_1_mapping[n - 1] = (uint32_t)n - 1;
    state.sigma_2_mapping[n - 1] = (uint32_t)n - 1 + (1U << 30U);
    state.sigma_3_mapping[n - 1] = (uint32_t)n - 1 + (1U << 31U);

    fr::zero(state.q_l[n - 1]);
    fr::zero(state.q_r[n - 1]);
    fr::zero(state.q_o[n - 1]);
    fr::zero(state.q_m[n - 1]);
    }

TEST(composer, composer_verifier)
{
    size_t n = 32;

    waffle::circuit_state state;
    state.small_domain = polynomials::evaluation_domain(n);
    state.mid_domain = polynomials::evaluation_domain(2 * n);
    state.large_domain = polynomials::evaluation_domain(4 * n);

    state.n = n;

    fr::field_t* data = (fr::field_t*)(aligned_alloc(32, sizeof(fr::field_t) * (17 * n + 2)));
    generate_test_data(state, data);

    // load structured reference string from disk
    srs::plonk_srs srs;
    srs.degree = n;
    srs.monomials = (g1::affine_element*)(aligned_alloc(32, sizeof(g1::affine_element) * (2 * n + 2)));
    io::read_transcript(srs, "../srs_db/transcript.dat");

    scalar_multiplication::generate_pippenger_point_table(srs.monomials, srs.monomials, n);

    // process circuit
    waffle::circuit_instance instance = waffle::preprocess_circuit(state, srs);

    // construct proof
    waffle::plonk_proof proof = waffle::construct_proof(state, srs);

    // verify proof
    bool result = waffle::verifier::verify_proof(proof, instance, srs.SRS_T2);

    EXPECT_EQ(result, true);
    free(data);
    free(srs.monomials);
}