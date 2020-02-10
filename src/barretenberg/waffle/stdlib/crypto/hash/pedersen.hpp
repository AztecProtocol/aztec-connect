#pragma once

namespace waffle {
class TurboComposer;
}

namespace plonk {
namespace stdlib {

template <typename ComposerContext> class field_t;

namespace pedersen {
field_t<waffle::TurboComposer> compress(const field_t<waffle::TurboComposer>& left,
                                        const field_t<waffle::TurboComposer>& right);
}
} // namespace stdlib
} // namespace plonk