#ifndef ARITHMETIC_WIDGET_HPP
#define ARITHMETIC_WIDGET_HPP

#include <vector>

#include "../../types.hpp"
#include "../../fields/fr.hpp"
#include "./base_widget.hpp"

namespace waffle
{

class arithmetic_widget : virtual public base_widget
{

public:
    arithmetic_widget(const size_t &size_hint) : base_widget(size_hint)
    {
        q_m.reserve(size_hint);
        q_l.reserve(size_hint);
        q_r.reserve(size_hint);
        q_o.reserve(size_hint);
        q_c.reserve(size_hint);
    }

    arithmetic_widget(const arithmetic_widget &other) : base_widget(other)
    {
        std::copy(other.q_m.begin(), other.q_m.end(), q_m);
        std::copy(other.q_l.begin(), other.q_l.end(), q_l);
        std::copy(other.q_r.begin(), other.q_r.end(), q_r);
        std::copy(other.q_o.begin(), other.q_o.end(), q_o);
        std::copy(other.q_c.begin(), other.q_c.end(), q_c);
    }

    arithmetic_widget& operator=(const arithmetic_widget &other)
    {

    }

    arithmetic_widget& operator=(arithmetic_widget &&other)
    {

    }

    ~arithmetic_widget()
    {

    }

    inline void add_multiplication_gate(
        const barretenberg::fr::field_t &_q_m,
        const barretenberg::fr::field_t &_q_o,
        const barretenberg::fr::field_t &_q_c)
    {
        q_m.emplace_back(_q_m);
        q_o.emplace_back(_q_o);
        q_c.emplace_back(_q_c);
        q_l.emplace_back(barretenberg::fr::zero());
        q_r.emplace_back(barretenberg::fr::zero());
    }

    inline void add_addition_gate(
        const barretenberg::fr::field_t &_q_l,
        const barretenberg::fr::field_t &_q_r,
        const barretenberg::fr::field_t &_q_o,
        const barretenberg::fr::field_t &_q_c)
    {
        q_l.emplace_back(_q_l);
        q_r.emplace_back(_q_r);
        q_o.emplace_back(_q_o);
        q_c.emplace_back(_q_c);
        q_m.emplace_back(barretenberg::fr::zero());
    }

    inline void add_bool_gate()
    {
        q_m.emplace_back(barretenberg::fr::one());
        q_l.emplace_back(barretenberg::fr::zero());
        q_r.emplace_back(barretenberg::fr::zero());
        q_o.emplace_back(barretenberg::fr::neg_one());
        q_c.emplace_back(barretenberg::fr::zero());
    }

    inline void add_noop_gate()
    {
        q_m.emplace_back(barretenberg::fr::zero());
        q_l.emplace_back(barretenberg::fr::zero());
        q_r.emplace_back(barretenberg::fr::zero());
        q_o.emplace_back(barretenberg::fr::zero());
        q_c.emplace_back(barretenberg::fr::zero());
    }

    void compute_quotient_polynomial_contribution(const circuit_state& state, const witness_ffts &ffts, barretenberg::fr::field_t *quotient_polynomial_mid, barretenberg::fr::field_t *quotient_polynomial_large);

private:
    std::vector<barretenberg::fr::field_t> q_m;
    std::vector<barretenberg::fr::field_t> q_l;
    std::vector<barretenberg::fr::field_t> q_r;
    std::vector<barretenberg::fr::field_t> q_o;
    std::vector<barretenberg::fr::field_t> q_c;
};

}
#endif