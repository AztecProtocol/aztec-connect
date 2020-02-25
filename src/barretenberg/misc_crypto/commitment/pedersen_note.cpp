#include "./pedersen_note.hpp"
#include "../pedersen/pedersen.hpp"

using namespace barretenberg;

namespace crypto {
namespace pedersen_note {
grumpkin::g1::affine_element encrypt_note(const private_note& plaintext)
{
    grumpkin::g1::element p_1 =
        pedersen::fixed_base_scalar_mul<32>(fr::to_montgomery_form({ plaintext.value, 0, 0, 0 }), 0);
    grumpkin::g1::element p_2 = pedersen::fixed_base_scalar_mul<250>(plaintext.secret, 1);

    grumpkin::g1::element sum;
    if (plaintext.value > 0) {
        grumpkin::g1::add(p_1, p_2, sum);
    } else {
        sum = p_2;
    }
    grumpkin::g1::affine_element p_3 = pedersen::compress_to_point_native(plaintext.owner.x, plaintext.owner.y, 0);

    grumpkin::g1::mixed_add(sum, p_3, sum);

    sum = grumpkin::g1::normalize(sum);

    return { sum.x, sum.y };
}
} // namespace pedersen_note
} // namespace crypto