#pragma once

#include <memory>
#include <vector>

#include "../../../curves/bn254/fr.hpp"
#include "../../../curves/bn254/g1.hpp"
#include "../../../polynomials/evaluation_domain.hpp"

#include "../../waffle_types.hpp"
#include "../verification_key/verification_key.hpp"

namespace transcript {
class Transcript;
}

namespace waffle {

struct proving_key;

class ReferenceString;

class VerifierBaseWidget {
  public:
    struct challenge_coefficients {
        barretenberg::fr::field_t alpha_base;
        barretenberg::fr::field_t alpha_step;
        barretenberg::fr::field_t nu_base;
        barretenberg::fr::field_t nu_step;
        barretenberg::fr::field_t linear_nu;
    };
    VerifierBaseWidget() = default;
    VerifierBaseWidget(const VerifierBaseWidget& other) = default;

    VerifierBaseWidget(VerifierBaseWidget&& other) = default;
    virtual ~VerifierBaseWidget() = default;

    virtual challenge_coefficients append_scalar_multiplication_inputs(
        verification_key*,
        const challenge_coefficients& challenge,
        const transcript::Transcript& transcript,
        std::vector<barretenberg::g1::affine_element>& points,
        std::vector<barretenberg::fr::field_t>& scalars) = 0;

    virtual barretenberg::fr::field_t compute_batch_evaluation_contribution(
        verification_key*,
        barretenberg::fr::field_t& batch_eval,
        const barretenberg::fr::field_t& nu_base,
        const transcript::Transcript& transcript) = 0;

    virtual barretenberg::fr::field_t compute_quotient_evaluation_contribution(
        verification_key*,
        const barretenberg::fr::field_t& alpha_base,
        const transcript::Transcript&,
        barretenberg::fr::field_t&)
    {
        return alpha_base;
    }

    bool verify_instance_commitments()
    {
        bool valid = true;
        // TODO: if instance commitments are points at infinity, this is probably ok?
        // because selector polynomials can be all zero :/. TODO: check?
        // for (size_t i = 0; i < instance.size(); ++i)
        // {
        //     valid = valid && barretenberg::g1::on_curve(instance[i]);
        // }
        return valid;
    }
};

class ProverBaseWidget {
  public:
    ProverBaseWidget(proving_key* input_key, program_witness* input_witness)
        : key(input_key)
        , witness(input_witness)
    {}
    ProverBaseWidget(const ProverBaseWidget& other)
        : key(other.key)
        , witness(other.witness)
    {}
    ProverBaseWidget(ProverBaseWidget&& other)
        : key(other.key)
        , witness(other.witness)
    {}

    ProverBaseWidget& operator=(const ProverBaseWidget& other)
    {
        key = other.key;
        witness = other.witness;
        return *this;
    }

    ProverBaseWidget& operator=(ProverBaseWidget&& other)
    {
        key = other.key;
        witness = other.witness;
        return *this;
    }

    virtual ~ProverBaseWidget() {}

    virtual barretenberg::fr::field_t compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                                    const transcript::Transcript& transcript) = 0;
    virtual barretenberg::fr::field_t compute_linear_contribution(const barretenberg::fr::field_t& alpha_base,
                                                                  const transcript::Transcript& transcript,
                                                                  barretenberg::polynomial& r) = 0;
    virtual barretenberg::fr::field_t compute_opening_poly_contribution(const barretenberg::fr::field_t& nu_base,
                                                                        const transcript::Transcript& transcript,
                                                                        barretenberg::fr::field_t* poly,
                                                                        barretenberg::fr::field_t*) = 0;
    virtual void compute_transcript_elements(transcript::Transcript&){};

    proving_key* key;
    program_witness* witness;
};

} // namespace waffle
