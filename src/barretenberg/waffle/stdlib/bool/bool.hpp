#ifndef PLONK_BOOL_HPP
#define PLONK_BOOL_HPP

#include "../../../fields/fr.hpp"
#include "../common.hpp"

namespace plonk
{
namespace stdlib
{

template <typename ComposerContext>
class bool_t
{
public:
    bool_t();
    bool_t(ComposerContext *parent_context);
    bool_t(ComposerContext *parent_context, const bool value);
    bool_t(const witness_t<ComposerContext> &value);
    bool_t(const bool_t &other);
    bool_t(bool_t &&other);
    ~bool_t() {};

    bool_t& operator=(const bool other);
    bool_t& operator=(const witness_t<ComposerContext> &other);
    bool_t& operator=(const bool_t &other);
    bool_t& operator=(bool_t &&other);
    // field_t& operator=(const barretenberg::fr::field_t &value);

    // bitwise operations
    bool_t operator&(const bool_t &other) const;
    bool_t operator|(const bool_t &other) const;
    bool_t operator^(const bool_t &other) const;
    bool_t operator!() const;


    // equality checks
    bool_t operator==(const bool_t &other) const;

    bool_t operator!=(const bool_t &other) const
    {
        return operator^(other);
    }

    // misc bool ops
    bool_t operator~() const
    {
        return operator!();
    }

    bool_t operator&&(const bool_t &other) const
    {
        return operator&(other);
    }

    bool_t operator||(const bool_t &other) const
    {
        return operator|(other);
    }

    // self ops
    void operator|=(const bool_t &other) const
    {
        *this = operator|(other);
    }

    void operator&=(const bool_t &other) const
    {
        *this = operator&(other);
    }

    void operator^=(const bool_t &other) const
    {
        *this = operator^(other);
    }

    ComposerContext *context;
    barretenberg::fr::field_t witness;
    bool witness_bool;
    bool witness_inverted = false;
    uint32_t witness_index = static_cast<uint32_t>(-1);    
};
}
}

#include "./bool.tcc"
#endif