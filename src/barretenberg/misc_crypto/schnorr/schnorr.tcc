#pragma once

namespace crypto
{
namespace schnorr
{
    template <typename Hash, typename Fq, typename Fr, typename G1>
    signature construct_signature(const std::string& message, const key_pair<Fr, G1>& account)
    {
        signature sig;
        typename Fr::field_t k = Fr::random_element(); // TODO replace with HMAC
        typename G1::affine_element R = G1::group_exponentiation(G1::affine_one, k);

        std::vector<uint8_t> r(sizeof(typename Fq::field_t));
        Fq::serialize_to_buffer(R.x, &r[0]);

        std::vector<uint8_t> message_buffer;

        std::copy(r.begin(), r.end(), std::back_inserter(message_buffer));
        std::copy(message.begin(), message.end(), std::back_inserter(message_buffer));

        sig.e = Hash::hash(message_buffer);

        typename Fr::field_t e = Fr::serialize_from_buffer(&sig.e[0]);

        typename Fr::field_t s = Fr::sub(k, Fr::mul(account.private_key, e));

        sig.s.resize(32);
        Fr::serialize_to_buffer(s, &sig.s[0]);
        return sig;
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
}
}