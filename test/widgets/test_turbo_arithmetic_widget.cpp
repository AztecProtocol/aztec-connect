#include <gtest/gtest.h>

#include <barretenberg/waffle/proof_system/widgets/turbo_arithmetic_widget.hpp>
#include <barretenberg/waffle/composer/standard_composer.hpp>

#include <iostream>
#include <memory>

#include "../test_helpers.hpp"

using namespace barretenberg;


TEST(turbo_arithmetic_widget, quotient_polynomial_satisfiability)
{
    const size_t num_gates = 4;
    waffle::ProverTurboArithmeticWidget widget(num_gates);
    
    waffle::CircuitFFTState circuit_state(num_gates);
    polynomial w_1(num_gates);
    polynomial w_2(num_gates);
    polynomial w_3(num_gates);
    polynomial w_4(num_gates);

    polynomial q_1(num_gates);
    polynomial q_2(num_gates);
    polynomial q_3(num_gates);
    polynomial q_4(num_gates);
    polynomial q_4_next(num_gates);
    polynomial q_m(num_gates);
    polynomial q_c(num_gates);
    polynomial q_arith(num_gates);

    for (size_t i = 0; i < num_gates; ++i)
    {
        w_1[i] = (fr::random_element());
        w_2[i] = (fr::random_element());
        w_3[i] = (fr::random_element());
        w_4[i] = (fr::random_element());

        q_1[i] = (fr::random_element());
        q_2[i] = (fr::random_element());
        q_3[i] = (fr::random_element());
        q_4[i] = (fr::random_element());
        q_m[i] = (fr::random_element());
        q_4_next[i] = (fr::zero);

        fr::field_t T0;
        fr::field_t T1;
        fr::__mul(w_1[i], w_2[i], T0);
        fr::__mul(T0, q_m[i], T0);

        fr::__mul(w_1[i], q_1[i], T1);
        fr::__add(T0, T1, T0);

        fr::__mul(w_2[i], q_2[i], T1);
        fr::__add(T0, T1, T0);

        fr::__mul(w_3[i], q_3[i], T1);
        fr::__add(T0, T1, T0);

        fr::__mul(w_4[i], q_4[i], T1);
        fr::__add(T0, T1, T0);

        fr::__neg(T0, T0);
        q_c[i] = (T0);
        q_arith[i] = fr::one;

    }

    circuit_state.w_l_fft = polynomial(w_1, 4 * num_gates + 4);
    circuit_state.w_r_fft = polynomial(w_2, 4 * num_gates + 4);
    circuit_state.w_o_fft = polynomial(w_3, 4 * num_gates + 4);
    circuit_state.w_4_fft = polynomial(w_4, 4 * num_gates + 4);

    circuit_state.w_l_fft.ifft(circuit_state.small_domain);
    circuit_state.w_r_fft.ifft(circuit_state.small_domain);
    circuit_state.w_o_fft.ifft(circuit_state.small_domain);
    circuit_state.w_4_fft.ifft(circuit_state.small_domain);

    circuit_state.w_l_fft.coset_fft(circuit_state.large_domain);
    circuit_state.w_r_fft.coset_fft(circuit_state.large_domain);
    circuit_state.w_o_fft.coset_fft(circuit_state.large_domain);
    circuit_state.w_4_fft.coset_fft(circuit_state.large_domain);

    circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[0]);
    circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[1]);
    circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[2]);
    circuit_state.w_l_fft.add_lagrange_base_coefficient(circuit_state.w_l_fft[3]);
    circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[0]);
    circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[1]);
    circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[2]);
    circuit_state.w_r_fft.add_lagrange_base_coefficient(circuit_state.w_r_fft[3]);
    circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[0]);
    circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[1]);
    circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[2]);
    circuit_state.w_o_fft.add_lagrange_base_coefficient(circuit_state.w_o_fft[3]);
    circuit_state.w_4_fft.add_lagrange_base_coefficient(circuit_state.w_4_fft[0]);
    circuit_state.w_4_fft.add_lagrange_base_coefficient(circuit_state.w_4_fft[1]);
    circuit_state.w_4_fft.add_lagrange_base_coefficient(circuit_state.w_4_fft[2]);
    circuit_state.w_4_fft.add_lagrange_base_coefficient(circuit_state.w_4_fft[3]);

    // widget.w_4 = polynomial(w_4);
    widget.q_1 = polynomial(q_1);
    widget.q_2 = polynomial(q_2);
    widget.q_3 = polynomial(q_3);
    widget.q_4 = polynomial(q_4);
    widget.q_4_next = polynomial(q_4_next);
    widget.q_m = polynomial(q_m);
    widget.q_c = polynomial(q_c);
    widget.q_arith = polynomial(q_arith);

    transcript::Transcript transcript = test_helpers::create_dummy_standard_transcript();

    circuit_state.quotient_large = polynomial(num_gates * 4);
    for (size_t i = 0; i < num_gates * 4; ++i)
    {
        circuit_state.quotient_large[i] = fr::zero;
    }
    widget.compute_quotient_contribution(fr::one, transcript, circuit_state);

    circuit_state.quotient_large.coset_ifft(circuit_state.large_domain);
    circuit_state.quotient_large.fft(circuit_state.large_domain);
    for (size_t i = 0; i < num_gates; ++i)
    {
        EXPECT_EQ(fr::eq(circuit_state.quotient_large[i * 4], fr::zero), true);
    }
}