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

    ~plonk_circuit_state() {}

    void compute_permutation_lagrange_base_full();
    void compute_wire_coefficients();
    void compute_z_coefficients();
    void compute_wire_commitments();
    void compute_z_commitment();
    void compute_quotient_commitment();
    void compute_permutation_grand_product_coefficients(polynomial &z_fft);
    void compute_identity_grand_product_coefficients(polynomial &z_fft);
    void compute_arithmetisation_coefficients();
    void compute_quotient_polynomial();
    barretenberg::fr::field_t compute_linearisation_coefficients();
    plonk_proof construct_proof();
    circuit_instance construct_instance();

    size_t n;
    polynomial w_l;
    polynomial w_r;
    polynomial w_o;
    polynomial q_m;
    polynomial q_l;
    polynomial q_r;
    polynomial q_o;
    polynomial q_c;
    polynomial sigma_1;
    polynomial sigma_2;
    polynomial sigma_3;
    polynomial z;

    polynomial p_rax;
    polynomial p_rbx;
    polynomial p_rcx;
    polynomial p_rdx;
    polynomial p_rdi;
    polynomial p_rsi;
    polynomial p_r8;
    polynomial p_r9;

    polynomial r;

    polynomial quotient_large;
    polynomial quotient_mid;

    evaluation_domain small_domain;
    evaluation_domain mid_domain;
    evaluation_domain large_domain;

    std::vector<uint32_t> sigma_1_mapping;
    std::vector<uint32_t> sigma_2_mapping;
    std::vector<uint32_t> sigma_3_mapping;

    plonk_challenges challenges;
    plonk_proof proof;
    srs::plonk_srs reference_string;
};

}
#endif