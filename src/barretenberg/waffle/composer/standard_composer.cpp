#include "./standard_composer.hpp"

#include <math.h>

#include "../../assert.hpp"
#include "../../curves/bn254/fr.hpp"
#include "../proof_system/widgets/arithmetic_widget.hpp"

using namespace barretenberg;

namespace waffle {
void StandardComposer::create_add_gate(const add_triple& in)
{
    gate_flags.push_back(0);
    w_l.emplace_back(in.a);
    w_r.emplace_back(in.b);
    w_o.emplace_back(in.c);
    q_m.emplace_back(fr::zero);
    q_1.emplace_back(in.a_scaling);
    q_2.emplace_back(in.b_scaling);
    q_3.emplace_back(in.c_scaling);
    q_c.emplace_back(in.const_scaling);

    epicycle left{ static_cast<uint32_t>(n), WireType::LEFT };
    epicycle right{ static_cast<uint32_t>(n), WireType::RIGHT };
    epicycle out{ static_cast<uint32_t>(n), WireType::OUTPUT };
    ASSERT(wire_epicycles.size() > in.a);
    ASSERT(wire_epicycles.size() > in.b);
    ASSERT(wire_epicycles.size() > in.c);
    wire_epicycles[static_cast<size_t>(in.a)].emplace_back(left);
    wire_epicycles[static_cast<size_t>(in.b)].emplace_back(right);
    wire_epicycles[static_cast<size_t>(in.c)].emplace_back(out);
    ++n;
}

void StandardComposer::create_mul_gate(const mul_triple& in)
{
    gate_flags.push_back(0);
    add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_LEFT_WIRE);
    add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_RIGHT_WIRE);
    w_l.emplace_back(in.a);
    w_r.emplace_back(in.b);
    w_o.emplace_back(in.c);
    q_m.emplace_back(in.mul_scaling);
    q_1.emplace_back(fr::zero);
    q_2.emplace_back(fr::zero);
    q_3.emplace_back(in.c_scaling);
    q_c.emplace_back(in.const_scaling);

    epicycle left{ static_cast<uint32_t>(n), WireType::LEFT };
    epicycle right{ static_cast<uint32_t>(n), WireType::RIGHT };
    epicycle out{ static_cast<uint32_t>(n), WireType::OUTPUT };
    ASSERT(wire_epicycles.size() > in.a);
    ASSERT(wire_epicycles.size() > in.b);
    ASSERT(wire_epicycles.size() > in.c);
    wire_epicycles[static_cast<size_t>(in.a)].emplace_back(left);
    wire_epicycles[static_cast<size_t>(in.b)].emplace_back(right);
    wire_epicycles[static_cast<size_t>(in.c)].emplace_back(out);
    ++n;
}

void StandardComposer::create_bool_gate(const uint32_t variable_index)
{
    gate_flags.push_back(0);
    add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_LEFT_WIRE);
    add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_RIGHT_WIRE);
    w_l.emplace_back(variable_index);
    w_r.emplace_back(variable_index);
    w_o.emplace_back(variable_index);

    q_m.emplace_back(fr::one);
    q_1.emplace_back(fr::zero);
    q_2.emplace_back(fr::zero);
    q_3.emplace_back(fr::neg_one());
    q_c.emplace_back(fr::zero);

    epicycle left{ static_cast<uint32_t>(n), WireType::LEFT };
    epicycle right{ static_cast<uint32_t>(n), WireType::RIGHT };
    epicycle out{ static_cast<uint32_t>(n), WireType::OUTPUT };
    ASSERT(wire_epicycles.size() > variable_index);
    wire_epicycles[static_cast<size_t>(variable_index)].emplace_back(left);
    wire_epicycles[static_cast<size_t>(variable_index)].emplace_back(right);
    wire_epicycles[static_cast<size_t>(variable_index)].emplace_back(out);
    ++n;
}

void StandardComposer::create_poly_gate(const poly_triple& in)
{
    gate_flags.push_back(0);
    add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_LEFT_WIRE);
    add_gate_flag(gate_flags.size() - 1, GateFlags::FIXED_RIGHT_WIRE);
    w_l.emplace_back(in.a);
    w_r.emplace_back(in.b);
    w_o.emplace_back(in.c);
    q_m.emplace_back(in.q_m);
    q_1.emplace_back(in.q_l);
    q_2.emplace_back(in.q_r);
    q_3.emplace_back(in.q_o);
    q_c.emplace_back(in.q_c);

    epicycle left{ static_cast<uint32_t>(n), WireType::LEFT };
    epicycle right{ static_cast<uint32_t>(n), WireType::RIGHT };
    epicycle out{ static_cast<uint32_t>(n), WireType::OUTPUT };
    ASSERT(wire_epicycles.size() > in.a);
    ASSERT(wire_epicycles.size() > in.b);
    ASSERT(wire_epicycles.size() > in.c);
    wire_epicycles[static_cast<size_t>(in.a)].emplace_back(left);
    wire_epicycles[static_cast<size_t>(in.b)].emplace_back(right);
    wire_epicycles[static_cast<size_t>(in.c)].emplace_back(out);
    ++n;
}

void StandardComposer::create_dummy_gates()
{
    gate_flags.push_back(0);
    // add in a dummy gate to ensure that all of our polynomials are not zero and not identical
    q_m.emplace_back(fr::to_montgomery_form({ { 1, 0, 0, 0 } }));
    q_1.emplace_back(fr::to_montgomery_form({ { 2, 0, 0, 0 } }));
    q_2.emplace_back(fr::to_montgomery_form({ { 3, 0, 0, 0 } }));
    q_3.emplace_back(fr::to_montgomery_form({ { 4, 0, 0, 0 } }));
    q_c.emplace_back(fr::to_montgomery_form({ { 5, 0, 0, 0 } }));

    uint32_t a_idx = add_variable(fr::to_montgomery_form({ { 6, 0, 0, 0 } }));
    uint32_t b_idx = add_variable(fr::to_montgomery_form({ { 7, 0, 0, 0 } }));
    uint32_t c_idx = add_variable(fr::neg(fr::to_montgomery_form({ { 20, 0, 0, 0 } })));

    w_l.emplace_back(a_idx);
    w_r.emplace_back(b_idx);
    w_o.emplace_back(c_idx);

    epicycle left{ static_cast<uint32_t>(n), WireType::LEFT };
    epicycle right{ static_cast<uint32_t>(n), WireType::RIGHT };
    epicycle out{ static_cast<uint32_t>(n), WireType::OUTPUT };
    ASSERT(wire_epicycles.size() > a_idx);
    ASSERT(wire_epicycles.size() > b_idx);
    ASSERT(wire_epicycles.size() > c_idx);
    wire_epicycles[static_cast<size_t>(a_idx)].emplace_back(left);
    wire_epicycles[static_cast<size_t>(b_idx)].emplace_back(right);
    wire_epicycles[static_cast<size_t>(c_idx)].emplace_back(out);
    ++n;

    // add a second dummy gate the ensure our permutation polynomials are also
    // distinct from the identity permutation
    q_m.emplace_back(fr::to_montgomery_form({ { 1, 0, 0, 0 } }));
    q_1.emplace_back(fr::to_montgomery_form({ { 1, 0, 0, 0 } }));
    q_2.emplace_back(fr::to_montgomery_form({ { 1, 0, 0, 0 } }));
    q_3.emplace_back(fr::to_montgomery_form({ { 1, 0, 0, 0 } }));
    q_c.emplace_back((fr::to_montgomery_form({ { 127, 0, 0, 0 } })));

    w_l.emplace_back(c_idx);
    w_r.emplace_back(a_idx);
    w_o.emplace_back(b_idx);

    left = { static_cast<uint32_t>(n), WireType::LEFT };
    right = { static_cast<uint32_t>(n), WireType::RIGHT };
    out = { static_cast<uint32_t>(n), WireType::OUTPUT };
    ASSERT(wire_epicycles.size() > c_idx);
    ASSERT(wire_epicycles.size() > a_idx);
    ASSERT(wire_epicycles.size() > b_idx);
    wire_epicycles[static_cast<size_t>(c_idx)].emplace_back(left);
    wire_epicycles[static_cast<size_t>(a_idx)].emplace_back(right);
    wire_epicycles[static_cast<size_t>(b_idx)].emplace_back(out);
    ++n;
}


std::shared_ptr<proving_key> StandardComposer::compute_proving_key()
{
    if (computed_proving_key)
    {
        return circuit_proving_key;
    }
    ASSERT(wire_epicycles.size() == variables.size());
    ASSERT(n == q_m.size());
    ASSERT(n == q_1.size());
    ASSERT(n == q_2.size());
    ASSERT(n == q_3.size());

    size_t log2_n = static_cast<size_t>(log2(n + 1));
    if ((1UL << log2_n) != (n + 1)) {
        ++log2_n;
    }
    size_t new_n = 1UL << log2_n;
    for (size_t i = n; i < new_n; ++i) {
        q_m.emplace_back(fr::zero);
        q_1.emplace_back(fr::zero);
        q_2.emplace_back(fr::zero);
        q_3.emplace_back(fr::zero);
        q_c.emplace_back(fr::zero);
        w_l.emplace_back(zero_idx);
        w_r.emplace_back(zero_idx);
        w_o.emplace_back(zero_idx);
    }

    circuit_proving_key = std::make_shared<proving_key>(new_n);
    
    polynomial poly_q_m(new_n);
    polynomial poly_q_c(new_n);
    polynomial poly_q_1(new_n);
    polynomial poly_q_2(new_n);
    polynomial poly_q_3(new_n);

    for (size_t i = 0; i < new_n; ++i)
    {
        poly_q_m[i] = q_m[i];
        poly_q_1[i] = q_1[i];
        poly_q_2[i] = q_2[i];
        poly_q_3[i] = q_3[i];
        poly_q_c[i] = q_c[i];
    }

    poly_q_1.ifft(circuit_proving_key->small_domain);
    poly_q_2.ifft(circuit_proving_key->small_domain);
    poly_q_3.ifft(circuit_proving_key->small_domain);
    poly_q_m.ifft(circuit_proving_key->small_domain);
    poly_q_c.ifft(circuit_proving_key->small_domain);

    polynomial poly_q_1_fft(poly_q_1, new_n * 2);
    polynomial poly_q_2_fft(poly_q_2, new_n * 2);
    polynomial poly_q_3_fft(poly_q_3, new_n * 2);
    polynomial poly_q_m_fft(poly_q_m, new_n * 2);
    polynomial poly_q_c_fft(poly_q_c, new_n * 2);

    poly_q_1_fft.coset_fft(circuit_proving_key->mid_domain);
    poly_q_2_fft.coset_fft(circuit_proving_key->mid_domain);
    poly_q_3_fft.coset_fft(circuit_proving_key->mid_domain);
    poly_q_m_fft.coset_fft(circuit_proving_key->mid_domain);
    poly_q_c_fft.coset_fft(circuit_proving_key->mid_domain);

    // size_t memory = poly_q_m.get_max_size() * 5 * 32;
    // memory += poly_q_m_fft.get_max_size() * 5 * 32;
    // printf("constraint selector memory = %lu \n", memory / (1024UL * 1024UL));

    circuit_proving_key->constraint_selectors.insert({ "q_m", std::move(poly_q_m )});
    circuit_proving_key->constraint_selectors.insert({ "q_c", std::move(poly_q_c )});
    circuit_proving_key->constraint_selectors.insert({ "q_1", std::move(poly_q_1 )});
    circuit_proving_key->constraint_selectors.insert({ "q_2", std::move(poly_q_2 )});
    circuit_proving_key->constraint_selectors.insert({ "q_3", std::move(poly_q_3 )});

    circuit_proving_key->constraint_selector_ffts.insert({ "q_m_fft", std::move(poly_q_m_fft )});
    circuit_proving_key->constraint_selector_ffts.insert({ "q_c_fft", std::move(poly_q_c_fft )});
    circuit_proving_key->constraint_selector_ffts.insert({ "q_1_fft", std::move(poly_q_1_fft )});
    circuit_proving_key->constraint_selector_ffts.insert({ "q_2_fft", std::move(poly_q_2_fft )});
    circuit_proving_key->constraint_selector_ffts.insert({ "q_3_fft", std::move(poly_q_3_fft )});

    compute_sigma_permutations<3>(circuit_proving_key.get());
    computed_proving_key = true;
    return circuit_proving_key;
}

std::shared_ptr<verification_key> StandardComposer::compute_verification_key()
{
    if (computed_verification_key)
    {
        return circuit_verification_key;
    }
    if (!computed_proving_key)
    {
        compute_proving_key();
    }

    std::array<fr::field_t*, 8> poly_coefficients;
    poly_coefficients[0] = circuit_proving_key->constraint_selectors.at("q_1").get_coefficients();
    poly_coefficients[1] = circuit_proving_key->constraint_selectors.at("q_2").get_coefficients();
    poly_coefficients[2] = circuit_proving_key->constraint_selectors.at("q_3").get_coefficients();
    poly_coefficients[3] = circuit_proving_key->constraint_selectors.at("q_m").get_coefficients();
    poly_coefficients[4] = circuit_proving_key->constraint_selectors.at("q_c").get_coefficients();
    poly_coefficients[5] = circuit_proving_key->permutation_selectors.at("sigma_1").get_coefficients();
    poly_coefficients[6] = circuit_proving_key->permutation_selectors.at("sigma_2").get_coefficients();
    poly_coefficients[7] = circuit_proving_key->permutation_selectors.at("sigma_3").get_coefficients();

    std::vector<barretenberg::g1::affine_element> commitments;
    commitments.resize(8);

    for (size_t i = 0; i < 8; ++i) {
        g1::jacobian_to_affine(
            scalar_multiplication::pippenger(poly_coefficients[i], circuit_proving_key->reference_string.monomials, circuit_proving_key->n),
            commitments[i]);
    }

    circuit_verification_key = std::make_shared<verification_key>(circuit_proving_key->n);

    circuit_verification_key->constraint_selectors.insert({ "Q_1", commitments[0] });
    circuit_verification_key->constraint_selectors.insert({ "Q_2", commitments[1] });
    circuit_verification_key->constraint_selectors.insert({ "Q_3", commitments[2] });
    circuit_verification_key->constraint_selectors.insert({ "Q_M", commitments[3] });
    circuit_verification_key->constraint_selectors.insert({ "Q_C", commitments[4] });

    circuit_verification_key->permutation_selectors.insert({ "SIGMA_1", commitments[5] });
    circuit_verification_key->permutation_selectors.insert({ "SIGMA_2", commitments[6] });
    circuit_verification_key->permutation_selectors.insert({ "SIGMA_3", commitments[7] });

    computed_verification_key = true;
    return circuit_verification_key;
}

std::shared_ptr<program_witness> StandardComposer::compute_witness()
{
    if (computed_witness)
    {
        return witness;
    }
    witness = std::make_shared<program_witness>();

    size_t log2_n = static_cast<size_t>(log2(n + 1));
    if ((1UL << log2_n) != (n + 1)) {
        ++log2_n;
    }
    size_t new_n = 1UL << log2_n;
    for (size_t i = n; i < new_n; ++i) {
        w_l.emplace_back(zero_idx);
        w_r.emplace_back(zero_idx);
        w_o.emplace_back(zero_idx);
    }

    polynomial poly_w_1 = polynomial(new_n);
    polynomial poly_w_2 = polynomial(new_n);
    polynomial poly_w_3 = polynomial(new_n);

    for (size_t i = 0; i < new_n; ++i) {
        fr::__copy(variables[w_l[i]], poly_w_1.at(i));
        fr::__copy(variables[w_r[i]], poly_w_2.at(i));
        fr::__copy(variables[w_o[i]], poly_w_3.at(i));
    }

    witness->wires.insert({ "w_1", std::move(poly_w_1) });
    witness->wires.insert({ "w_2", std::move(poly_w_2) });
    witness->wires.insert({ "w_3", std::move(poly_w_3) });

    computed_witness = true;
    return witness;
}

Prover StandardComposer::preprocess()
{
    compute_proving_key();
    compute_witness();

    Prover output_state(circuit_proving_key, witness, create_manifest());

    std::unique_ptr<ProverArithmeticWidget> widget = std::make_unique<ProverArithmeticWidget>(circuit_proving_key.get(), witness.get());

    output_state.widgets.emplace_back(std::move(widget));

    return output_state;
}
} // namespace waffle