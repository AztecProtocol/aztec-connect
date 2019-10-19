#ifndef verifier_HPP
#define verifier_HPP

#include "../../../types.hpp"
#include "../widgets/base_widget.hpp"
#include "../../../groups/scalar_multiplication.hpp"

namespace waffle
{
namespace verifier
{
bool verify_proof(const waffle::plonk_proof &proof, const waffle::base_circuit_instance &instance, const barretenberg::g2::affine_element &SRS_T2);
} // namespace verifier
} // namespace waffle

#endif