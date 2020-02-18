// #include <gtest/gtest.h>

// #include <barretenberg/waffle/composer/bool_composer.hpp>
// #include <barretenberg/waffle/proof_system/preprocess.hpp>
// #include <barretenberg/waffle/proof_system/prover/prover.hpp>
// #include <barretenberg/waffle/proof_system/verifier/verifier.hpp>
// #include <barretenberg/waffle/proof_system/widgets/arithmetic_widget.hpp>

// #include <barretenberg/polynomials/polynomial_arithmetic.hpp>
// #include <memory>

// using namespace barretenberg;

// TEST(bool_composer, test_add_gate_proofs)
// {
//     waffle::BoolComposer composer = waffle::BoolComposer();
//     fr::field_t a = fr::one;
//     fr::field_t b = fr::one;
//     fr::field_t c = fr::add(a, b);
//     fr::field_t d = fr::add(a, c);
//     uint32_t a_idx = composer.add_public_variable(a);
//     uint32_t b_idx = composer.add_public_variable(b);
//     uint32_t c_idx = composer.add_variable(c);
//     uint32_t d_idx = composer.add_variable(d);
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });

//     composer.create_add_gate({ d_idx, c_idx, a_idx, fr::one, fr::neg_one(), fr::neg_one(), fr::zero });

//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ b_idx, a_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });

//     waffle::Prover prover = composer.preprocess();

//     waffle::Verifier verifier = composer.create_verifier();

//     waffle::plonk_proof proof = prover.construct_proof();

//     bool result = verifier.verify_proof(proof);
//     EXPECT_EQ(result, true);
// }

// TEST(bool_composer, test_mul_gate_proofs)
// {
//     waffle::BoolComposer composer = waffle::BoolComposer();
//     fr::field_t q[7]{ fr::random_element(), fr::random_element(), fr::random_element(), fr::random_element(),
//                       fr::random_element(), fr::random_element(), fr::random_element() };
//     fr::field_t q_inv[7]{
//         fr::invert(q[0]), fr::invert(q[1]), fr::invert(q[2]), fr::invert(q[3]),
//         fr::invert(q[4]), fr::invert(q[5]), fr::invert(q[6]),
//     };

//     fr::field_t a = fr::random_element();
//     fr::field_t b = fr::random_element();
//     fr::field_t c = fr::neg(fr::mul(fr::add(fr::add(fr::mul(q[0], a), fr::mul(q[1], b)), q[3]), q_inv[2]));
//     fr::field_t d = fr::neg(fr::mul(fr::add(fr::mul(q[4], fr::mul(a, b)), q[6]), q_inv[5]));

//     uint32_t a_idx = composer.add_variable(a);
//     uint32_t b_idx = composer.add_variable(b);
//     uint32_t c_idx = composer.add_variable(c);
//     uint32_t d_idx = composer.add_variable(d);

//     composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
//     composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
//     composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
//     composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
//     composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
//     composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
//     composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
//     composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
//     composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
//     composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
//     composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
//     composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });
//     composer.create_add_gate({ a_idx, b_idx, c_idx, q[0], q[1], q[2], q[3] });
//     composer.create_mul_gate({ a_idx, b_idx, d_idx, q[4], q[5], q[6] });

//     waffle::Prover prover = composer.preprocess();

//     waffle::Verifier verifier = composer.create_verifier();

//     waffle::plonk_proof proof = prover.construct_proof();

//     bool result = verifier.verify_proof(proof);
//     EXPECT_EQ(result, true);
// }

// TEST(bool_composer, test_bool_gate_proofs)
// {
//     waffle::BoolComposer composer = waffle::BoolComposer();

//     fr::field_t a = fr::one;
//     fr::field_t b = fr::zero;
//     fr::field_t c = fr::one;
//     uint32_t a_idx = composer.add_variable(a);
//     uint32_t b_idx = composer.add_variable(b);
//     uint32_t c_idx = composer.add_variable(c);
//     size_t n = 27;
//     for (size_t i = 0; i < n; ++i)
//     {
//         composer.create_bool_gate(a_idx);
//         composer.create_bool_gate(b_idx);
//         composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     }

//     waffle::Prover prover = composer.preprocess();

//     EXPECT_EQ(prover.n, 32UL);
//     waffle::Verifier verifier = composer.create_verifier();

//     waffle::plonk_proof proof = prover.construct_proof();

//     bool result = verifier.verify_proof(proof); // instance, prover.reference_string.SRS_T2);
//     EXPECT_EQ(result, true);
// }

// TEST(bool_composers, test_deferred_bool_gate_proofs)
// {
//     waffle::BoolComposer composer = waffle::BoolComposer();

//     size_t n = 27;
//     for (size_t i = 0; i < n; ++i)
//     {
//         fr::field_t a = fr::one;
//         fr::field_t b = fr::zero;
//         fr::field_t c = fr::one;
//         uint32_t a_idx = composer.add_variable(a);
//         uint32_t b_idx = composer.add_variable(b);
//         uint32_t c_idx = composer.add_variable(c);
//         composer.create_bool_gate(a_idx);
//         composer.create_bool_gate(b_idx);
//         composer.create_bool_gate(c_idx);
//         composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//     }

//     waffle::Prover prover = composer.preprocess();
//     EXPECT_EQ(composer.get_num_gates(), 27UL + composer.get_num_constant_gates());
//     EXPECT_EQ(prover.n, 32UL);
//     waffle::Verifier verifier = composer.create_verifier();

//     waffle::plonk_proof proof = prover.construct_proof();

//     bool result = verifier.verify_proof(proof); // instance, prover.reference_string.SRS_T2);
//     EXPECT_EQ(result, true);
// }

// TEST(bool_composers, test_repeated_bool_gate_proofs)
// {
//     waffle::BoolComposer composer = waffle::BoolComposer();

//     size_t n = 27;
//     for (size_t i = 0; i < n; ++i)
//     {
//         fr::field_t a = fr::one;
//         fr::field_t b = fr::zero;
//         fr::field_t c = fr::one;
//         uint32_t a_idx = composer.add_variable(a);
//         uint32_t b_idx = composer.add_variable(b);
//         uint32_t c_idx = composer.add_variable(c);
//         composer.create_bool_gate(a_idx);
//         composer.create_bool_gate(b_idx);
//         composer.create_bool_gate(c_idx);
//         composer.create_add_gate({ a_idx, b_idx, c_idx, fr::one, fr::one, fr::neg_one(), fr::zero });
//         composer.create_bool_gate(a_idx);
//         composer.create_bool_gate(b_idx);
//         composer.create_bool_gate(c_idx); // heyho
//     }

//     waffle::Prover prover = composer.preprocess();
//     EXPECT_EQ(composer.get_num_gates(), 27UL + composer.get_num_constant_gates());
//     EXPECT_EQ(prover.n, 32UL);
//     waffle::Verifier verifier = composer.create_verifier();

//     waffle::plonk_proof proof = prover.construct_proof();

//     bool result = verifier.verify_proof(proof); // instance, prover.reference_string.SRS_T2);
//     EXPECT_EQ(result, true);
// }