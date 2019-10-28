#include "./arithmetic_widget.hpp"

#include "../../../fields/fr.hpp"
#include "../../../types.hpp"
#include "../../../groups/g1.hpp"
#include "../../../groups/scalar_multiplication.hpp"
#include "../../../polynomials/evaluation_domain.hpp"

using namespace barretenberg;

namespace waffle
{
ProverArithmeticWidget::ProverArithmeticWidget(const size_t n) :
    ProverBaseWidget(
        static_cast<size_t>(WidgetVersionControl::Dependencies::NONE),
        static_cast<size_t>(WidgetVersionControl::Features::STANDARD)
    )
{
    q_m.resize(n);
    q_l.resize(n);
    q_r.resize(n);
    q_o.resize(n);
    q_c.resize(n);
}

ProverArithmeticWidget::ProverArithmeticWidget(const ProverArithmeticWidget &other) : ProverBaseWidget(other)
{
    q_m = polynomial(other.q_m);
    q_l = polynomial(other.q_l);
    q_r = polynomial(other.q_r);
    q_o = polynomial(other.q_o);
    q_c = polynomial(other.q_c);
}

ProverArithmeticWidget::ProverArithmeticWidget(ProverArithmeticWidget &&other) : ProverBaseWidget(other)
{
    q_m = polynomial(other.q_m);
    q_l = polynomial(other.q_l);
    q_r = polynomial(other.q_r);
    q_o = polynomial(other.q_o);
    q_c = polynomial(other.q_c);
}

ProverArithmeticWidget& ProverArithmeticWidget::operator=(const ProverArithmeticWidget &other)
{
    q_m = polynomial(other.q_m);
    q_l = polynomial(other.q_l);
    q_r = polynomial(other.q_r);
    q_o = polynomial(other.q_o);
    q_c = polynomial(other.q_c);
    version = WidgetVersionControl(other.version);
    return *this;
}

ProverArithmeticWidget& ProverArithmeticWidget::operator=(ProverArithmeticWidget &&other)
{
    q_m = polynomial(other.q_m);
    q_l = polynomial(other.q_l);
    q_r = polynomial(other.q_r);
    q_o = polynomial(other.q_o);
    q_c = polynomial(other.q_c);
    version = WidgetVersionControl(other.version);
    return *this;
}

fr::field_t ProverArithmeticWidget::compute_quotient_contribution(const barretenberg::fr::field_t& alpha_base, const barretenberg::fr::field_t &alpha_step, CircuitFFTState& circuit_state)
{
    q_m.ifft(circuit_state.small_domain);
    q_l.ifft(circuit_state.small_domain);
    q_r.ifft(circuit_state.small_domain);
    q_o.ifft(circuit_state.small_domain);
    q_c.ifft(circuit_state.small_domain);

    polynomial q_m_fft = polynomial(q_m, circuit_state.mid_domain.size);
    polynomial q_l_fft = polynomial(q_l, circuit_state.mid_domain.size);
    polynomial q_r_fft = polynomial(q_r, circuit_state.mid_domain.size);
    polynomial q_o_fft = polynomial(q_o, circuit_state.mid_domain.size);
    polynomial q_c_fft = polynomial(q_c, circuit_state.mid_domain.size);

    q_m_fft.coset_fft_with_constant(circuit_state.mid_domain, alpha_base);
    q_l_fft.coset_fft_with_constant(circuit_state.mid_domain, alpha_base);
    q_r_fft.coset_fft_with_constant(circuit_state.mid_domain, alpha_base);
    q_o_fft.coset_fft_with_constant(circuit_state.mid_domain, alpha_base);
    q_c_fft.coset_fft_with_constant(circuit_state.mid_domain, alpha_base);

    ITERATE_OVER_DOMAIN_START(circuit_state.mid_domain);
        fr::__mul(circuit_state.w_l_fft.at(2 * i), q_m_fft.at(i), q_m_fft.at(i)); // w_l * q_m = rdx
        fr::__mul(q_m_fft.at(i), circuit_state.w_r_fft.at(2 * i), q_m_fft.at(i)); // w_l * w_r * q_m = rdx
        fr::__mul(circuit_state.w_l_fft.at(2 * i), q_l_fft.at(i), q_l_fft.at(i)); // w_l * q_l = rdi
        fr::__mul(circuit_state.w_r_fft.at(2 * i), q_r_fft.at(i), q_r_fft.at(i)); // w_r * q_r = rsi
        fr::__mul(circuit_state.w_o_fft.at(2 * i), q_o_fft.at(i),  q_o_fft.at(i)); // w_o * q_o = r8
        fr::__add(q_m_fft.at(i), q_l_fft.at(i), q_m_fft.at(i)); // q_m * w_l * w_r + w_l * q_l = rdx
        fr::__add(q_r_fft.at(i), q_o_fft.at(i),  q_r_fft.at(i)); // q_r * w_r + q_o * w_o = rsi
        fr::__add(q_m_fft.at(i), q_r_fft.at(i),  q_m_fft.at(i)); // q_m * w_l * w_r + w_l * q_l + q_r * w_r + q_o * w_o = rdx
        fr::__add(q_m_fft.at(i), q_c_fft.at(i),  q_m_fft.at(i)); // q_m * w_l * w_r + w_l * q_l + q_r * w_r + q_o * w_o + q_c = rdx
        fr::__add(circuit_state.quotient_mid.at(i), q_m_fft.at(i), circuit_state.quotient_mid.at(i));
    ITERATE_OVER_DOMAIN_END;

    return fr::mul(alpha_base, alpha_step);
}

fr::field_t ProverArithmeticWidget::compute_linear_contribution(const fr::field_t &alpha_base, const fr::field_t &alpha_step, const waffle::plonk_proof &proof, const evaluation_domain& domain, polynomial &r)
{
    fr::field_t w_lr = fr::mul(proof.w_l_eval, proof.w_r_eval);
    ITERATE_OVER_DOMAIN_START(domain);
        fr::field_t T0;
        fr::field_t T1;
        fr::field_t T2;
        fr::field_t T3;
        fr::__mul(w_lr, q_m.at(i), T0);
        fr::__mul(proof.w_l_eval, q_l.at(i), T1);
        fr::__mul(proof.w_r_eval, q_r.at(i), T2);
        fr::__mul(proof.w_o_eval, q_o.at(i), T3);
        fr::__add(T0, T1, T0);
        fr::__add(T2, T3, T2);
        fr::__add(T0, T2, T0);
        fr::__add(T0, q_c.at(i), T0);
        fr::__mul(T0, alpha_base, T0);
        fr::__add(r.at(i), T0, r.at(i));
    ITERATE_OVER_DOMAIN_END;
    return fr::mul(alpha_base, alpha_step);
}

std::unique_ptr<VerifierBaseWidget> ProverArithmeticWidget::compute_preprocessed_commitments(const evaluation_domain& domain, const srs::plonk_srs &reference_string) const
{
    polynomial polys[5]{
        polynomial(q_m, domain.size),
        polynomial(q_l, domain.size),
        polynomial(q_r, domain.size),
        polynomial(q_o, domain.size),
        polynomial(q_c, domain.size),
    };

    for (size_t i = 0; i < 5; ++i)
    {
        polys[i].ifft(domain);
    }

    scalar_multiplication::multiplication_state mul_state[5]{
        { reference_string.monomials, polys[0].get_coefficients(), domain.size, {}},
        { reference_string.monomials, polys[1].get_coefficients(), domain.size, {}},
        { reference_string.monomials, polys[2].get_coefficients(), domain.size, {}},
        { reference_string.monomials, polys[3].get_coefficients(), domain.size, {}},
        { reference_string.monomials, polys[4].get_coefficients(), domain.size, {}}
    };

    scalar_multiplication::batched_scalar_multiplications(mul_state, 5);
    std::vector<barretenberg::g1::affine_element> commitments;
    commitments.resize(5);

    for (size_t i = 0; i < 5; ++i)
    {
        g1::jacobian_to_affine(mul_state[i].output, commitments[i]);
    }
    std::unique_ptr<VerifierBaseWidget> result = std::make_unique<VerifierArithmeticWidget>(commitments);
    return result;
}

void ProverArithmeticWidget::reset(const barretenberg::evaluation_domain& domain)
{
    q_m.fft(domain);
    q_l.fft(domain);
    q_r.fft(domain);
    q_o.fft(domain);
    q_c.fft(domain);
}

// ###

VerifierArithmeticWidget::VerifierArithmeticWidget(std::vector<barretenberg::g1::affine_element> &instance_commitments) :
    VerifierBaseWidget(
        static_cast<size_t>(WidgetVersionControl::Dependencies::NONE),
        static_cast<size_t>(WidgetVersionControl::Features::STANDARD)
    )
{
    ASSERT(instance_commitments.size() == 5);
    instance = std::vector<g1::affine_element>{
        instance_commitments[0],
        instance_commitments[1],
        instance_commitments[2],
        instance_commitments[3],
        instance_commitments[4],
    };
}

VerifierBaseWidget::challenge_coefficients VerifierArithmeticWidget::append_scalar_multiplication_inputs(
    const challenge_coefficients &challenge,
    const waffle::plonk_proof &proof,
    std::vector<barretenberg::g1::affine_element> &points,
    std::vector<barretenberg::fr::field_t> &scalars)
{
    for (size_t i = 0; i < instance.size(); ++i)
    {
        points.push_back(instance[i]);
    }

    // Q_M term = w_l * w_r * challenge.alpha_base * nu
    fr::field_t q_m_term;
    fr::__mul(proof.w_l_eval, proof.w_r_eval, q_m_term);
    fr::__mul(q_m_term, challenge.alpha_base, q_m_term);
    fr::__mul(q_m_term, challenge.linear_nu, q_m_term);
    scalars.push_back(q_m_term);

    fr::field_t q_l_term;
    fr::__mul(proof.w_l_eval, challenge.alpha_base, q_l_term);
    fr::__mul(q_l_term, challenge.linear_nu, q_l_term);
    scalars.push_back(q_l_term);

    fr::field_t q_r_term;
    fr::__mul(proof.w_r_eval, challenge.alpha_base, q_r_term);
    fr::__mul(q_r_term, challenge.linear_nu, q_r_term);
    scalars.push_back(q_r_term);

    fr::field_t q_o_term;
    fr::__mul(proof.w_o_eval, challenge.alpha_base, q_o_term);
    fr::__mul(q_o_term, challenge.linear_nu, q_o_term);
    scalars.push_back(q_o_term);

    fr::field_t q_c_term;
    fr::__mul(challenge.alpha_base, challenge.linear_nu, q_c_term);
    scalars.push_back(q_c_term);

    return challenge_coefficients{
        fr::mul(challenge.alpha_base, challenge.alpha_step),
        challenge.alpha_step,
        challenge.nu_base,
        challenge.nu_step,
        challenge.linear_nu
    };
}
}