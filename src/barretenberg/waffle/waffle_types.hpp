#pragma once

#include "../fields/fq.hpp"
#include "../fields/fr.hpp"
#include "../groups/g1.hpp"

namespace waffle
{
struct plonk_challenges
{
    barretenberg::fr::field_t beta;
    barretenberg::fr::field_t gamma;
    barretenberg::fr::field_t alpha;
    barretenberg::fr::field_t z;
    barretenberg::fr::field_t nu;
};

struct plonk_proof
{
    // Kate polynomial commitments required for a proof of knowledge
    barretenberg::g1::affine_element W_L;
    barretenberg::g1::affine_element W_R;
    barretenberg::g1::affine_element W_O;
    barretenberg::g1::affine_element Z_1;
    barretenberg::g1::affine_element T_LO;
    barretenberg::g1::affine_element T_MID;
    barretenberg::g1::affine_element T_HI;
    barretenberg::g1::affine_element PI_Z;
    barretenberg::g1::affine_element PI_Z_OMEGA;

    barretenberg::fr::field_t w_l_eval;
    barretenberg::fr::field_t w_r_eval;
    barretenberg::fr::field_t w_o_eval;
    barretenberg::fr::field_t sigma_1_eval;
    barretenberg::fr::field_t sigma_2_eval;
    barretenberg::fr::field_t z_1_shifted_eval;
    barretenberg::fr::field_t linear_eval;

    barretenberg::fr::field_t w_l_shifted_eval;
    barretenberg::fr::field_t w_r_shifted_eval;
    barretenberg::fr::field_t w_o_shifted_eval;
    barretenberg::fr::field_t q_c_eval;
    barretenberg::fr::field_t q_mimc_coefficient_eval;
    std::vector<barretenberg::fr::field_t> custom_gate_evaluations;
};
}