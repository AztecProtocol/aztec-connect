#ifndef WIDGET_PROVER_HPP
#define WIDGET_PROVER_HPP

#include "../types.hpp"
#include "../polynomials/polynomial.hpp"

#include "./widgets/widget_base.hpp"

namespace waffle
{

class test_circuit_state
{
public:
    test_circuit_state() = delete;
    test_circuit_state(const size_t n);
    test_circuit_state(const test_circuit_state& other) = delete;
    test_circuit_state(test_circuit_state&& other) = delete;
    test_circuit_state& operator=(const test_circuit_state &other) = delete;
    test_circuit_state& operator=(test_circuit_state &&other) = delete;

    ~test_circuit_state();

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
    barretenberg::polynomial sigma_1;
    barretenberg::polynomial sigma_2;
    barretenberg::polynomial sigma_3;
    barretenberg::polynomial z;

    barretenberg::polynomial r;

    waffle::base_circuit_state circuit_state;

    std::vector<uint32_t> sigma_1_mapping;
    std::vector<uint32_t> sigma_2_mapping;
    std::vector<uint32_t> sigma_3_mapping;

    // Hmm, mixing runtime polymorphism and zero-knowledge proof generation. This seems fine...
    std::vector<std::unique_ptr<ProverWidgetBase> > widgets;
    plonk_challenges challenges;
    plonk_proof proof;
    srs::plonk_srs reference_string;
};

}
#endif