#pragma once

#include <memory>

#include "../../../polynomials/polynomial.hpp"
#include "../../../types.hpp"

#include "../../reference_string/reference_string.hpp"
#include "../../waffle_types.hpp"
#include "../widgets/base_widget.hpp"

#include "../circuit_state.hpp"
#include "../transcript/transcript.hpp"
#include "../transcript/manifest.hpp"

namespace waffle
{

class Prover
{
  public:
    Prover(const size_t n = 0, const transcript::ProgramManifest &manifest = transcript::ProgramManifest({}));
    Prover(Prover&& other);
    Prover(const Prover& other) = delete;
    Prover& operator=(const Prover& other) = delete;
    Prover& operator=(Prover&& other);

    void compute_permutation_lagrange_base_full();
    void compute_wire_coefficients();
    void compute_z_coefficients();
    void compute_wire_commitments();
    void compute_z_commitment();
    void compute_quotient_commitment();
    void compute_permutation_grand_product_coefficients(barretenberg::polynomial& z_fft);
    void compute_identity_grand_product_coefficients(barretenberg::polynomial& z_fft);
    void compute_arithmetisation_coefficients();
    void init_quotient_polynomials();
    void compute_quotient_polynomial();
    void compute_opening_elements();
    barretenberg::fr::field_t compute_linearisation_coefficients();
    waffle::plonk_proof construct_proof();
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

    // TODO change to fft_state;
    waffle::CircuitFFTState circuit_state;

    std::vector<uint32_t> sigma_1_mapping;
    std::vector<uint32_t> sigma_2_mapping;
    std::vector<uint32_t> sigma_3_mapping;

    // Hmm, mixing runtime polymorphism and zero-knowledge proof generation. This seems fine...
    std::vector<std::unique_ptr<ProverBaseWidget>> widgets;
    ReferenceString reference_string;
    transcript::Transcript transcript;
};

} // namespace waffle