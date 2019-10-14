#ifndef PROVER_HPP
#define PROVER_HPP

#include "../types.hpp"
#include "../polynomials/polynomial.hpp"

namespace waffle
{

class plonk_circuit_state
{
public:
    plonk_circuit_state() = delete;
    plonk_circuit_state(const size_t n);
    plonk_circuit_state(const plonk_circuit_state& other) = delete;
    plonk_circuit_state(plonk_circuit_state&& other) = delete;
    plonk_circuit_state& operator=(const plonk_circuit_state &other) = delete;
    plonk_circuit_state& operator=(plonk_circuit_state &&other) = delete;

    ~plonk_circuit_state();

    void compute_permutation_lagrange_base_full();
    void compute_wire_coefficients();
    void compute_z_coefficients();
    void compute_wire_commitments();
    void compute_z_commitment();
    void compute_quotient_commitment();
    void compute_permutation_grand_product_coefficients(barretenberg::polynomial &z_fft);
    void compute_identity_grand_product_coefficients(barretenberg::polynomial &z_fft);
    void compute_arithmetisation_coefficients();
    void compute_quotient_polynomial();
    barretenberg::fr::field_t compute_linearisation_coefficients();
    plonk_proof construct_proof();
    void reset();

    size_t n;
    barretenberg::polynomial w_l;
    barretenberg::polynomial w_r;
    barretenberg::polynomial w_o;
    barretenberg::polynomial q_m;
    barretenberg::polynomial q_l;
    barretenberg::polynomial q_r;
    barretenberg::polynomial q_o;
    barretenberg::polynomial q_c;
    barretenberg::polynomial sigma_1;
    barretenberg::polynomial sigma_2;
    barretenberg::polynomial sigma_3;
    barretenberg::polynomial z;

    barretenberg::polynomial p_rax;
    barretenberg::polynomial p_rbx;
    barretenberg::polynomial p_rcx;
    barretenberg::polynomial p_rdx;
    barretenberg::polynomial p_rdi;
    barretenberg::polynomial p_rsi;
    barretenberg::polynomial p_r8;
    barretenberg::polynomial p_r9;

    barretenberg::polynomial r;

    barretenberg::polynomial quotient_large;
    barretenberg::polynomial quotient_mid;

    barretenberg::evaluation_domain small_domain;
    barretenberg::evaluation_domain mid_domain;
    barretenberg::evaluation_domain large_domain;

    std::vector<uint32_t> sigma_1_mapping;
    std::vector<uint32_t> sigma_2_mapping;
    std::vector<uint32_t> sigma_3_mapping;

    plonk_challenges challenges;
    plonk_proof proof;
    srs::plonk_srs reference_string;
};

}
#endif