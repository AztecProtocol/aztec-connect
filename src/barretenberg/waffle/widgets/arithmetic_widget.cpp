#include "../../assert.hpp"
#include "../../types.hpp"

#include "../../polynomials/polynomials.hpp"

#include "./arithmetic_widget.hpp"

using namespace barretenberg;

namespace waffle
{
void arithmetic_widget::compute_quotient_polynomial_contribution(const circuit_state& state, const witness_ffts& ffts, fr::field_t* quotient_polynomial_large, fr::field_t* quotient_polynomial_mid)
{
    ASSERT(q_m.size() == state.small_domain.size);
    ASSERT(q_l.size() == state.small_domain.size);
    ASSERT(q_r.size() == state.small_domain.size);
    ASSERT(q_o.size() == state.small_domain.size);
    ASSERT(q_c.size() == state.small_domain.size);


    fr::field_t *scratch_space = (fr::field_t*)aligned_alloc(32, sizeof(fr::field_t) * state.small_domain.size * 6);
    fr::field_t *q_m_poly = &scratch_space[0];
    fr::field_t *q_l_poly = &scratch_space[0];
    fr::field_t *q_r_poly = &scratch_space[state.mid_domain.size];
    fr::field_t *q_o_poly = &scratch_space[state.mid_domain.size << 1];
    polynomials::ifft(&q_l[0], state.small_domain);
    polynomials::ifft(&q_r[0], state.small_domain);
    polynomials::ifft(&q_o[0], state.small_domain);

    polynomials::copy_polynomial(&q_l[0], q_l_poly, state.small_domain.size, state.mid_domain.size);
    polynomials::copy_polynomial(&q_r[0], q_r_poly, state.small_domain.size, state.mid_domain.size);
    polynomials::copy_polynomial(&q_o[0], q_o_poly, state.small_domain.size, state.mid_domain.size);

    polynomials::fft_with_coset_and_constant(q_l_poly, state.mid_domain, state.challenges.alpha);
    polynomials::fft_with_coset_and_constant(q_r_poly, state.mid_domain, state.challenges.alpha);
    polynomials::fft_with_coset_and_constant(q_o_poly, state.mid_domain, state.challenges.alpha);

    ITERATE_OVER_DOMAIN_START(state.mid_domain);
        fr::field_t T0;
        fr::field_t T1;
        fr::field_t T2;
        fr::__mul(ffts.w_r_mid[i], q_r_poly[i], T0);
        fr::__mul(ffts.w_l_mid[i], q_l_poly[i], T1);
        fr::__mul(ffts.w_o_mid[i], q_o_poly[i], T2);
        fr::__add(T0, T1, T0);
        fr::__add(T0, T2, T0);
        fr::__add(quotient_polynomial_mid[i], T0, quotient_polynomial_mid[i]);
    ITERATE_OVER_DOMAIN_END;

    polynomials::ifft(&q_m[0], state.small_domain);
    polynomials::copy_polynomial(&q_m[0], q_m_poly, state.small_domain.size, state.large_domain.size);
    polynomials::fft_with_coset_and_constant(q_m_poly, state.large_domain, state.challenges.alpha);

    ITERATE_OVER_DOMAIN_START(state.large_domain);
    fr::field_t T0;
    fr::__mul(ffts.w_l_large[i], ffts.w_r_large[i], T0);
    fr::__mul(T0, q_m_poly[i], T0);
    fr::__add(quotient_polynomial_large[i], T0, quotient_polynomial_large[i]);
    ITERATE_OVER_DOMAIN_END;
}
}