#ifndef PLONK_BOOL_TCC
#define PLONK_BOOL_TCC

namespace plonk
{
namespace stdlib
{

template <typename ComposerContext>
bool_t<ComposerContext>::bool_t(ComposerContext *parent_context) : context(parent_context)
{
    ASSERT(parent_context != nullptr);
    witness = barretenberg::fr::zero();
}

template <typename ComposerContext>
bool_t<ComposerContext>::bool_t(ComposerContext *parent_context, const witness_t &value) : context(parent_context)
{
    ASSERT(parent_context != nullptr);
    ASSERT(barretenberg::fr::eq(value.witness, barretenberg::fr::zero()) || barretenberg::fr::eq(value.witness, barretenberg::fr::one()));
    witness_index = context->add_variable(witness);
    context->create_bool_gate(witness_index);
    barretenberg::fr::copy(value.witness, witness);
    witness_bool = barretenberg::fr::eq(value.witness, barretenberg::fr::one());
}

template <typename ComposerContext>
bool_t<ComposerContext>::bool_t(ComposerContext *parent_context, const bool value) : context(parent_context)
{
    
}
}
}