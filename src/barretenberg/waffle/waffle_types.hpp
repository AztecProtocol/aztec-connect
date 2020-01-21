#pragma once

#include <map>

#include "../curves/bn254/fq.hpp"
#include "../curves/bn254/fr.hpp"
#include "../curves/bn254/g1.hpp"
#include "../polynomials/evaluation_domain.hpp"
#include "../polynomials/polynomial.hpp"
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
    }

    proving_key(const proving_key& other)
        : n(other.n)
        , constraint_selectors(other.constraint_selectors)
        , constraint_selector_ffts(other.constraint_selector_ffts)
        , permutation_selectors(other.permutation_selectors)
        , permutation_selectors_lagrange_base(other.permutation_selectors_lagrange_base)
        , permutation_selector_ffts(other.permutation_selector_ffts)
        , small_domain(other.small_domain)
        , mid_domain(other.mid_domain)
        , large_domain(other.large_domain)
        , reference_string(other.reference_string)
    {}

    proving_key(proving_key&& other)
        : n(other.n)
        , constraint_selectors(other.constraint_selectors)
        , constraint_selector_ffts(other.constraint_selector_ffts)
        , permutation_selectors(other.permutation_selectors)
        , permutation_selectors_lagrange_base(other.permutation_selectors_lagrange_base)
        , permutation_selector_ffts(other.permutation_selector_ffts)
        , small_domain(std::move(other.small_domain))
        , mid_domain(std::move(other.mid_domain))
        , large_domain(std::move(other.large_domain))
        , reference_string(std::move(other.reference_string))
    {}

    proving_key& operator=(proving_key&& other)
    {
        n = other.n;
        constraint_selectors = std::move(other.constraint_selectors);
        constraint_selector_ffts = std::move(other.constraint_selector_ffts);
        permutation_selectors = std::move(other.permutation_selectors);
        permutation_selectors_lagrange_base = std::move(other.permutation_selectors_lagrange_base);
        permutation_selector_ffts = std::move(other.permutation_selector_ffts);

        small_domain = std::move(other.small_domain);
        mid_domain = std::move(other.mid_domain);
        large_domain = std::move(other.large_domain);
        reference_string = std::move(other.reference_string);
        return *this;   
    }

    size_t n;

    std::map<std::string, barretenberg::polynomial> constraint_selectors;
    std::map<std::string, barretenberg::polynomial> constraint_selector_ffts;

    std::map<std::string, barretenberg::polynomial> permutation_selectors;
    std::map<std::string, barretenberg::polynomial> permutation_selectors_lagrange_base;
    std::map<std::string, barretenberg::polynomial> permutation_selector_ffts;

    barretenberg::evaluation_domain small_domain;
    barretenberg::evaluation_domain mid_domain;
    barretenberg::evaluation_domain large_domain;

    ReferenceString reference_string;

    static constexpr size_t min_thread_block = 4UL;
};

struct program_witness
{
    std::map<std::string, barretenberg::polynomial> wires;
    std::map<std::string, barretenberg::polynomial> wire_ffts;
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