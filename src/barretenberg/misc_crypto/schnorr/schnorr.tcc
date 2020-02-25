#pragma once

namespace crypto {
namespace schnorr {
template <typename Hash, typename Fq, typename Fr, typename G1>
signature construct_signature(const std::string& message, const key_pair<Fr, G1>& account)
{
    signature sig;
    typename Fr::field_t k = Fr::random_element(); // TODO replace with HMAC
    typename G1::affine_element R = G1::group_exponentiation(G1::affine_one, k);

    std::vector<uint8_t> r(sizeof(typename Fq::field_t));
    Fq::serialize_to_buffer(R.x, &r[0]);

    std::vector<uint8_t> message_buffer;
    // message_buffer.resize(r.size() + message.size());
    std::copy(r.begin(), r.end(), std::back_inserter(message_buffer));
    std::copy(message.begin(), message.end(), std::back_inserter(message_buffer));

    auto ev = Hash::hash(message_buffer);
    std::copy(ev.begin(), ev.end(), sig.e.begin());

    typename Fr::field_t e = Fr::serialize_from_buffer(&sig.e[0]);

    typename Fr::field_t s = Fr::sub(k, Fr::mul(account.private_key, e));

    Fr::serialize_to_buffer(s, &sig.s[0]);
    return sig;
}

template <typename Hash, typename Fq, typename Fr, typename G1>
signature_b construct_signature_b(const std::string& message, const key_pair<Fr, G1>& account)
{
    signature_b sig;
    typename Fr::field_t k = Fr::random_element(); // TODO replace with HMAC
    typename G1::affine_element R = G1::group_exponentiation(G1::affine_one, k);
    Fq::serialize_to_buffer(R.x, &sig.r[0]);

    typename Fq::field_t yy = Fq::add(Fq::mul(Fq::sqr(R.x), R.x), G1::curve_b);
    typename Fq::field_t y_candidate;
    Fq::__sqrt(yy, y_candidate);
    // if the signer / verifier sqrt algorithm is consistent, this *should* work...
    bool flip_sign = !Fq::eq(R.y, y_candidate);

    sig.r[0] = sig.r[0] | static_cast<uint8_t>(flip_sign ? 128U : 0U);
    std::vector<uint8_t> message_buffer;
    std::copy(sig.r.begin(), sig.r.end(), std::back_inserter(message_buffer));
    std::copy(message.begin(), message.end(), std::back_inserter(message_buffer));
    std::vector<uint8_t> e_vec = Hash::hash(message_buffer);

    typename Fr::field_t e = Fr::serialize_from_buffer(&e_vec[0]);
    typename Fr::field_t s = Fr::sub(account.private_key, Fr::mul(k, e));

    Fr::serialize_to_buffer(s, &sig.s[0]);
    return sig;
}

template <typename Hash, typename Fq, typename Fr, typename G1>
typename G1::affine_element ecrecover(const std::string& message, const signature_b& sig)
{
    std::vector<uint8_t> message_buffer;
    std::copy(sig.r.begin(), sig.r.end(), std::back_inserter(message_buffer));
    std::copy(message.begin(), message.end(), std::back_inserter(message_buffer));
    std::vector e_vec = Hash::hash(message_buffer);
    typename Fr::field_t target_e = Fr::serialize_from_buffer(&e_vec[0]);

    std::vector<uint8_t> r;
    std::copy(sig.r.begin(), sig.r.end(), std::back_inserter(r));

    bool flip_sign = (r[0] & 128U) == 128U;
    r[0] = r[0] & 127U;
    typename Fq::field_t r_x = Fq::serialize_from_buffer(&r[0]);
    typename Fq::field_t r_yy = Fq::add(Fq::mul(Fq::sqr(r_x), r_x), G1::curve_b);
    typename Fq::field_t r_y;
    Fq::__sqrt(r_yy, r_y);

    if ((flip_sign)) {
        r_y = Fq::neg(r_y);
    }
    typename G1::affine_element R{ r_x, r_y };
    typename Fr::field_t s = Fr::serialize_from_buffer(&sig.s[0]);
    typename G1::affine_element R1 = G1::group_exponentiation(G1::affine_one, s);
    typename G1::affine_element R2 = G1::group_exponentiation(R, target_e);
    typename G1::element R2_jac{ R2.x, R2.y, Fq::one };
    typename G1::element key_jac;
    G1::mixed_add(R2_jac, R1, key_jac);
    key_jac = G1::normalize(key_jac);
    typename G1::affine_element key{ key_jac.x, key_jac.y };
    return key;
}

template <typename Hash, typename Fq, typename Fr, typename G1>
bool verify_signature(const std::string& message, const typename G1::affine_element& public_key, const signature& sig)
{
    // r = g^s . pub^e
    // e = H(r, m)
    typename Fr::field_t s = Fr::serialize_from_buffer(&sig.s[0]);
    typename Fr::field_t source_e = Fr::serialize_from_buffer(&sig.e[0]);

    typename G1::affine_element R1 = G1::group_exponentiation(G1::affine_one, s);
    typename G1::affine_element R2 = G1::group_exponentiation(public_key, source_e);

    typename G1::element R2_ele{ R2.x, R2.y, Fq::one };

    typename G1::element R;
    G1::mixed_add(R2_ele, R1, R);
    R = G1::normalize(R);

    std::vector<uint8_t> r(sizeof(typename Fq::field_t));
    Fq::serialize_to_buffer(R.x, &r[0]);

    std::vector<uint8_t> message_buffer;
    std::copy(r.begin(), r.end(), std::back_inserter(message_buffer));
    std::copy(message.begin(), message.end(), std::back_inserter(message_buffer));
    std::vector e_vec = Hash::hash(message_buffer);
    typename Fr::field_t target_e = Fr::serialize_from_buffer(&e_vec[0]);

    return Fr::eq(source_e, target_e);
}
} // namespace schnorr
} // namespace crypto