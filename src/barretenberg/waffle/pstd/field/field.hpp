#ifndef FIELD_HPP
#define FIELD_HPP

#include "../../../fields/fr.hpp"

namespace pstd
{
struct witness_t
{
    witness_t(const barretenberg::fr::field_t &in)
    {
        barretenberg::fr::copy(in, witness);
    }

    barretenberg::fr::field_t witness;
};

template <typename ComposerContext>
class field_t
{
public:
    field_t(ComposerContext *parent_context);
    field_t(ComposerContext *parent_context, const barretenberg::fr::field_t &value);
    field_t(ComposerContext *parent_context, const witness_t &value);
    field_t(const field_t &other);
    field_t(field_t &&other);
    ~field_t();

    field_t& operator=(const field_t &other);
    field_t& operator=(field_t &&other);
    // field_t& operator=(const barretenberg::fr::field_t &value);

    field_t operator+(const field_t &other);
    field_t operator-(const field_t &other);
    field_t operator*(const field_t &other);
    // field_t operator/(const field_t &other);
    // field_t operator==(const field_t &other);

    field_t normalize();

    ComposerContext *context;
    barretenberg::fr::field_t additive_constant;
    barretenberg::fr::field_t multiplicative_constant;
    barretenberg::fr::field_t witness;
    uint32_t witness_index = static_cast<uint32_t>(-1);    
    // field_t operator+(const barretenberg::fr::field_t &other);    
};
}

#include "./field.tcc"
#endif