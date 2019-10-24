#ifndef verifier_HPP
#define verifier_HPP

#include "../../../types.hpp"
#include "../widgets/base_widget.hpp"
#include "../../../groups/scalar_multiplication.hpp"

namespace waffle
{
class Verifier
{
public:
    Verifier(const size_t subgroup_size = 0);
    Verifier(Verifier &&other);
    Verifier(const Verifier &other) = delete;
    Verifier& operator=(const Verifier &other) = delete;
    Verifier& operator=(Verifier &&other);

    ~Verifier();

    bool verify_proof(const plonk_proof &proof);

    barretenberg::g2::affine_element G2_X;
    barretenberg::g1::affine_element SIGMA_1;
    barretenberg::g1::affine_element SIGMA_2;
    barretenberg::g1::affine_element SIGMA_3;
    std::vector<std::unique_ptr<VerifierBaseWidget> > verifier_widgets;
    size_t n;
};

// namespace verifier
// {
// bool verify_proof(const waffle::plonk_proof &proof, const waffle::base_circuit_instance &instance, const barretenberg::g2::affine_element &SRS_T2);
// } // namespace verifier
} // namespace waffle

#endif