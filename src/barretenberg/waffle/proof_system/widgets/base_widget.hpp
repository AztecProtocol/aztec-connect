#pragma once

#include <memory>

#include "../../../types.hpp"
#include "../../../curves/bn254/g1.hpp"
#include "../../../polynomials/evaluation_domain.hpp"
#include "../../../polynomials/polynomial.hpp"

#include "../../reference_string/reference_string.hpp"
#include "../../waffle_types.hpp"

#include "../circuit_state.hpp"

namespace waffle
{
class WidgetVersionControl
{
  public:
    enum Dependencies
    {
        NONE = 0x0,
        REQUIRES_W_L_SHIFTED = 0x01,
        REQUIRES_W_R_SHIFTED = 0x02,
        REQUIRES_W_O_SHIFTED = 0x04
    };
    enum Features
    {
        STANDARD = 0x00,
        HAS_EXTENDED_ARITHMETISATION = 0x01,
        HAS_BOOL_SELECTORS = 0x02,
        HAS_MIMC_SELECTORS = 0x04,
        HAS_ECC_SELECTORS = 0x08
    };
    WidgetVersionControl(const size_t _dependencies, const size_t _features)
    {
        dependencies = _dependencies;
        features = _features;
    }
    WidgetVersionControl(const WidgetVersionControl& other) : dependencies(other.dependencies), features(other.features)
    {
    }

    bool has_dependency(Dependencies required_dependency)
    {
        return ((static_cast<size_t>(dependencies) & static_cast<size_t>(required_dependency)) != 0);
    }

    size_t dependencies;
    size_t features;
};

class VerifierBaseWidget
{
  public:
    struct challenge_coefficients
    {
        barretenberg::fr::field_t alpha_base;
        barretenberg::fr::field_t alpha_step;
        barretenberg::fr::field_t nu_base;
        barretenberg::fr::field_t nu_step;
        barretenberg::fr::field_t linear_nu;
    };
    VerifierBaseWidget(const size_t deps, const size_t feats) : version(deps, feats){};
    VerifierBaseWidget(const VerifierBaseWidget& other) : version(other.version)
    {
    }
    VerifierBaseWidget(VerifierBaseWidget&& other) : version(other.version)
    {
    }

    virtual barretenberg::fr::field_t compute_batch_evaluation_contribution(barretenberg::fr::field_t& batch_eval,
                                                                            barretenberg::fr::field_t& nu_base,
                                                                            barretenberg::fr::field_t& nu_step,
                                                                            const plonk_proof& proof) = 0;

    virtual challenge_coefficients
    append_scalar_multiplication_inputs(const challenge_coefficients& challenge,

                                        const waffle::plonk_proof& proof,
                                        std::vector<barretenberg::g1::affine_element>& points,
                                        std::vector<barretenberg::fr::field_t>& scalars) = 0;

    virtual bool verify_instance_commitments()
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

    std::vector<barretenberg::g1::affine_element> instance;
    WidgetVersionControl version;
};

class ProverBaseWidget
{
  public:
    ProverBaseWidget(const size_t deps = 0, const size_t feats = 0) : version(deps, feats){
    };
    ProverBaseWidget(const ProverBaseWidget& other) : version(other.version)
    {
    }
    ProverBaseWidget(ProverBaseWidget&& other) : version(other.version)
    {
    }

    virtual barretenberg::fr::field_t compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base,
                                                                    const barretenberg::fr::field_t& alpha_step,
                                                                    CircuitFFTState& circuit_state) = 0;
    virtual barretenberg::fr::field_t compute_linear_contribution(const barretenberg::fr::field_t& alpha_base,
                                                                  const barretenberg::fr::field_t&,
                                                                  const waffle::plonk_proof& proof,
                                                                  const barretenberg::evaluation_domain& domain,
                                                                  barretenberg::polynomial& r) = 0;
    virtual barretenberg::fr::field_t compute_opening_poly_contribution(barretenberg::fr::field_t* poly,
                                                                        const barretenberg::evaluation_domain& domain,
                                                                        const barretenberg::fr::field_t& nu_base,
                                                                        const barretenberg::fr::field_t& nu_step) = 0;
    virtual std::unique_ptr<VerifierBaseWidget>
    compute_preprocessed_commitments(const barretenberg::evaluation_domain& domain,
                                     const ReferenceString& reference_string) const = 0;
    virtual void compute_proof_elements(plonk_proof&, const barretenberg::fr::field_t&){};
    virtual void reset(const barretenberg::evaluation_domain& domain) = 0;

    // virtual Dependencies get_dependencies() const
    // {
    //     return Dependencies::NONE;
    // }
    // bool has_dependency(Dependencies required_dependency)
    // {
    //     return ((static_cast<size_t>(get_dependencies()) & static_cast<size_t>(required_dependency)) != 0);
    // }
    WidgetVersionControl version;
};

} // namespace waffle
