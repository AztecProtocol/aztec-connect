#pragma once

#include <map>
#include <string>

#include "../curves/bn254/fq.hpp"
#include "../curves/bn254/fr.hpp"
#include "../curves/bn254/g1.hpp"
#include "../polynomials/evaluation_domain.hpp"
#include "../polynomials/polynomial.hpp"
#include "../polynomials/polynomial_arithmetic.hpp"
#include "./reference_string/reference_string.hpp"

namespace waffle
{

struct proving_key
{
    public:
    proving_key(const size_t num_gates)
        : n(num_gates)
        , small_domain(n, n)
        , mid_domain(2 * n, n > min_thread_block ? n : 2 * n)
        , large_domain(4 * n, n > min_thread_block ? n : 4 * n)
        , reference_string(n)
    {
        if (n != 0)
        {
            small_domain.compute_lookup_table();
            mid_domain.compute_lookup_table();
            large_domain.compute_lookup_table();
        }

        barretenberg::polynomial w_1_fft = barretenberg::polynomial(4 * n + 4, 4 * n + 4);
        barretenberg::polynomial w_2_fft = barretenberg::polynomial(4 * n + 4, 4 * n + 4);
        barretenberg::polynomial w_3_fft = barretenberg::polynomial(4 * n + 4, 4 * n + 4);
        barretenberg::polynomial w_4_fft = barretenberg::polynomial(4 * n + 4, 4 * n + 4);
        z = barretenberg::polynomial(n, n);
        z_fft = barretenberg::polynomial(4 * n + 4, 4 * n + 4);

        memset((void*)&w_1_fft[0], 0x00, sizeof(barretenberg::fr::field_t) * (4 * n + 4));
        memset((void*)&w_2_fft[0], 0x00, sizeof(barretenberg::fr::field_t) * (4 * n + 4));
        memset((void*)&w_3_fft[0], 0x00, sizeof(barretenberg::fr::field_t) * (4 * n + 4));
        memset((void*)&w_4_fft[0], 0x00, sizeof(barretenberg::fr::field_t) * (4 * n + 4));
        memset((void*)&z[0], 0x00, sizeof(barretenberg::fr::field_t) * n);
        memset((void*)&z_fft[0], 0x00, sizeof(barretenberg::fr::field_t) * (4 * n + 4));

        wire_ffts.insert({ "w_1_fft", std::move(w_1_fft) });
        wire_ffts.insert({ "w_2_fft", std::move(w_2_fft) });
        wire_ffts.insert({ "w_3_fft", std::move(w_3_fft) });
        wire_ffts.insert({ "w_4_fft", std::move(w_4_fft) });

        lagrange_1 = barretenberg::polynomial(4 * n, 4 * n + 8);
        barretenberg::polynomial_arithmetic::compute_lagrange_polynomial_fft(lagrange_1.get_coefficients(), small_domain, large_domain);
        lagrange_1.add_lagrange_base_coefficient(lagrange_1[0]);
        lagrange_1.add_lagrange_base_coefficient(lagrange_1[1]);
        lagrange_1.add_lagrange_base_coefficient(lagrange_1[2]);
        lagrange_1.add_lagrange_base_coefficient(lagrange_1[3]);
        lagrange_1.add_lagrange_base_coefficient(lagrange_1[4]);
        lagrange_1.add_lagrange_base_coefficient(lagrange_1[5]);
        lagrange_1.add_lagrange_base_coefficient(lagrange_1[6]);
        lagrange_1.add_lagrange_base_coefficient(lagrange_1[7]);

        opening_poly = barretenberg::polynomial(n, n);
        shifted_opening_poly = barretenberg::polynomial(n, n);
        linear_poly = barretenberg::polynomial(n, n);
        memset((void*)&opening_poly[0], 0x00, sizeof(barretenberg::fr::field_t) * n);
        memset((void*)&shifted_opening_poly[0], 0x00, sizeof(barretenberg::fr::field_t) * n);
        memset((void*)&linear_poly[0], 0x00, sizeof(barretenberg::fr::field_t) * n);
    }

    proving_key(const proving_key& other)
        : n(other.n)
        , constraint_selectors(other.constraint_selectors)
        , constraint_selector_ffts(other.constraint_selector_ffts)
        , permutation_selectors(other.permutation_selectors)
        , permutation_selectors_lagrange_base(other.permutation_selectors_lagrange_base)
        , permutation_selector_ffts(other.permutation_selector_ffts)
        , wire_ffts(other.wire_ffts)
        , small_domain(other.small_domain)
        , mid_domain(other.mid_domain)
        , large_domain(other.large_domain)
        , reference_string(other.reference_string)
        , z(other.z)
        , z_fft(other.z_fft)
        , lagrange_1(other.lagrange_1)
        , opening_poly(other.opening_poly)
        , shifted_opening_poly(other.shifted_opening_poly)
        , linear_poly(other.linear_poly)
    {}

    proving_key(proving_key&& other)
        : n(other.n)
        , constraint_selectors(other.constraint_selectors)
        , constraint_selector_ffts(other.constraint_selector_ffts)
        , permutation_selectors(other.permutation_selectors)
        , permutation_selectors_lagrange_base(other.permutation_selectors_lagrange_base)
        , permutation_selector_ffts(other.permutation_selector_ffts)
        , wire_ffts(other.wire_ffts)
        , small_domain(std::move(other.small_domain))
        , mid_domain(std::move(other.mid_domain))
        , large_domain(std::move(other.large_domain))
        , reference_string(std::move(other.reference_string))
        , z(std::move(other.z))
        , z_fft(std::move(other.z_fft))
        , lagrange_1(std::move(other.lagrange_1))
        , opening_poly(std::move(other.opening_poly))
        , shifted_opening_poly(std::move(other.shifted_opening_poly))
        , linear_poly(std::move(other.linear_poly))
    {}

    proving_key& operator=(proving_key&& other)
    {
        n = other.n;
        constraint_selectors = std::move(other.constraint_selectors);
        constraint_selector_ffts = std::move(other.constraint_selector_ffts);
        permutation_selectors = std::move(other.permutation_selectors);
        permutation_selectors_lagrange_base = std::move(other.permutation_selectors_lagrange_base);
        permutation_selector_ffts = std::move(other.permutation_selector_ffts);
        wire_ffts = std::move(other.wire_ffts);
        small_domain = std::move(other.small_domain);
        mid_domain = std::move(other.mid_domain);
        large_domain = std::move(other.large_domain);
        reference_string = std::move(other.reference_string);
        z = std::move(other.z);
        z_fft = std::move(other.z_fft);
        lagrange_1 = std::move(other.lagrange_1);
        opening_poly = std::move(other.opening_poly);
        shifted_opening_poly = std::move(other.shifted_opening_poly);
        linear_poly = std::move(other.linear_poly);
        return *this;   
    }

    size_t n;

    std::map<std::string, barretenberg::polynomial> constraint_selectors;
    std::map<std::string, barretenberg::polynomial> constraint_selector_ffts;

    std::map<std::string, barretenberg::polynomial> permutation_selectors;
    std::map<std::string, barretenberg::polynomial> permutation_selectors_lagrange_base;
    std::map<std::string, barretenberg::polynomial> permutation_selector_ffts;

    std::map<std::string, barretenberg::polynomial> wire_ffts;

    barretenberg::evaluation_domain small_domain;
    barretenberg::evaluation_domain mid_domain;
    barretenberg::evaluation_domain large_domain;

    ReferenceString reference_string;

    barretenberg::polynomial z;
    barretenberg::polynomial z_fft;
    barretenberg::polynomial lagrange_1;
    barretenberg::polynomial opening_poly;
    barretenberg::polynomial shifted_opening_poly;
    barretenberg::polynomial linear_poly;
    static constexpr size_t min_thread_block = 4UL;
};

struct program_witness
{
    std::map<std::string, barretenberg::polynomial> wires;
};

struct verification_key
{
    verification_key(const size_t input_n) : n(input_n) {}

    std::map<std::string, barretenberg::g1::affine_element> constraint_selectors;

    std::map<std::string, barretenberg::g1::affine_element> permutation_selectors;

    const size_t n;
};

struct plonk_proof
{
    std::vector<uint8_t> proof_data;
};
// struct plonk_proof
// {
//     // Kate polynomial commitments required for a proof of knowledge
//     barretenberg::g1::affine_element W_L;
//     barretenberg::g1::affine_element W_R;
//     barretenberg::g1::affine_element W_O;
//     barretenberg::g1::affine_element Z_1;
//     barretenberg::g1::affine_element T_LO;
//     barretenberg::g1::affine_element T_MID;
//     barretenberg::g1::affine_element T_HI;
//     barretenberg::g1::affine_element PI_Z;
//     barretenberg::g1::affine_element PI_Z_OMEGA;

//     barretenberg::fr::field_t w_l_eval;
//     barretenberg::fr::field_t w_r_eval;
//     barretenberg::fr::field_t w_o_eval;
//     barretenberg::fr::field_t sigma_1_eval;
//     barretenberg::fr::field_t sigma_2_eval;
//     barretenberg::fr::field_t z_1_shifted_eval;
//     barretenberg::fr::field_t linear_eval;

//     barretenberg::fr::field_t w_l_shifted_eval;
//     barretenberg::fr::field_t w_r_shifted_eval;
//     barretenberg::fr::field_t w_o_shifted_eval;
//     barretenberg::fr::field_t q_c_eval;
//     barretenberg::fr::field_t q_mimc_coefficient_eval;
//     std::vector<barretenberg::fr::field_t> custom_gate_evaluations;
// };
}