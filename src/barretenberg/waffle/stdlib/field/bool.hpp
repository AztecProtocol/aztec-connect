#ifndef PLONK_BOOL_HPP
#define PLONK_BOOL_HPP

#include "../../../fields/fr.hpp"

namespace plonk
{
namespace stdlib
{

template <typename ComposerContext>
class bool_t
{
public:
    bool_t(ComposerContext *parent_context);
    bool_t(ComposerContext *parent_context, const witness_t &value);
    bool_t(const bool_t &other);
    bool_t(bool_t &&other);
    ~bool_t();

    bool_t& operator=(const bool_t &other);
    bool_t& operator=(bool_t &&other);
    // field_t& operator=(const barretenberg::fr::field_t &value);

    bool_t operator+(const bool_t &other);
    bool_t operator*(const bool_t &other);
    bool_t operator&(const bool_t &other);
    bool_t operator|(const bool_t &other);
    bool_t operator^(const bool_t &other);
    bool_t operator!(const bool_t &other);

    // field_t operator/(const field_t &other);
    // field_t operator==(const field_t &other);

    ComposerContext *context;
    bool witness_bool;
    barretenberg::fr::field_t witness;
    bool witness_inverted = false;
    uint32_t witness_index = static_cast<uint32_t>(-1);    
};
}
}

#include "./bool.tcc"
#endif