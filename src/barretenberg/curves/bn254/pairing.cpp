#include "./pairing.hpp"

#include "./fq12.hpp"
#include "./g1.hpp"
#include "./g2.hpp"

namespace barretenberg
{
namespace pairing
{
namespace
{
inline void mul_by_q(const g2::element& a, g2::element& r)
{
    fq2::field_t T0;
    fq2::field_t T1;
    fq2::frobenius_map(a.x, T0);
    fq2::frobenius_map(a.y, T1);
    fq2::__mul(fq2::twist_mul_by_q_x, T0, r.x);
    fq2::__mul(fq2::twist_mul_by_q_y, T1, r.y);
    fq2::frobenius_map(a.z, r.z);
}
}
void doubling_step_for_flipped_miller_loop(g2::element& current, fq12::ell_coeffs& ell)
{
    fq2::field_t a;
    fq2::field_t b;
    fq2::field_t c;
    fq2::field_t d;
    fq2::field_t e;
    fq2::field_t ee;
    fq2::field_t f;
    fq2::field_t g;
    fq2::field_t h;
    fq2::field_t i;
    fq2::field_t j;
    fq2::field_t k;

    fq2::__mul_by_fq(fq::two_inv, current.x, a);
    fq2::__mul(a, current.y, a);

    fq2::__sqr(current.y, b);
    fq2::__sqr(current.z, c);
    fq2::__add(c, c, d);
    fq2::__add(d, c, d);
    fq2::__mul(fq2::twist_coeff_b, d, e);
    fq2::__add(e, e, f);

    fq2::__add(f, e, f);

    fq2::__add(b, f, g);
    fq2::__mul_by_fq(fq::two_inv, g, g);

    fq2::__add(current.y, current.z, h);
    fq2::__sqr(h, h);
    fq2::__add(b, c, i);
    fq2::__sub(h, i, h);
    fq2::__sub(e, b, i);
    fq2::__sqr(current.x, j);

    fq2::__sqr(e, ee);

    fq2::__sub(b, f, k);
    fq2::__mul(a, k, current.x);

    fq2::__add(ee, ee, k);
    fq2::__add(k, ee, k);
    fq2::__sqr(g, c);
    fq2::__sub(c, k, current.y);

    fq2::__mul(b, h, current.z);

    fq6::__mul_by_non_residue(i, ell.o);
    fq2::__neg(h, ell.vw);
    fq2::__add(j, j, ell.vv);
    fq2::__add(ell.vv, j, ell.vv);
}

void mixed_addition_step_for_flipped_miller_loop(const g2::element& base, g2::element& Q, fq12::ell_coeffs& line)
{
    fq2::field_t d;
    fq2::field_t e;
    fq2::field_t f;
    fq2::field_t g;
    fq2::field_t h;
    fq2::field_t i;
    fq2::field_t j;

    fq2::__mul(base.x, Q.z, d);
    fq2::__sub(Q.x, d, d);

    fq2::__mul(base.y, Q.z, e);
    fq2::__sub(Q.y, e, e);

    fq2::__sqr(d, f);
    fq2::__sqr(e, g);
    fq2::__mul(d, f, h);
    fq2::__mul(Q.x, f, i);

    fq2::__mul(Q.z, g, j);
    fq2::__add(j, h, j);
    fq2::__sub(j, i, j);
    fq2::__sub(j, i, j);

    fq2::__mul(d, j, Q.x);
    fq2::__sub(i, j, i);
    fq2::__mul(i, e, i);
    fq2::__mul(Q.y, h, j);
    fq2::__sub(i, j, Q.y);
    fq2::__mul(Q.z, h, Q.z);

    fq2::__mul(e, base.x, h);
    fq2::__mul(d, base.y, i);
    fq2::__sub(h, i, h);
    fq6::__mul_by_non_residue(h, line.o);
    fq2::__neg(e, line.vv);
    fq2::__copy(d, line.vw);
}

void precompute_miller_lines(const g2::element& Q, miller_lines& lines)
{
    g2::element Q_neg;
    fq2::__copy(Q.x, Q_neg.x);
    fq2::__neg(Q.y, Q_neg.y);
    Q_neg.z = fq2::one;
    // g2::__neg(Q, Q_neg);
    g2::element work_point;
    g2::element result_point;
    g2::copy(Q, work_point);
    g2::copy(Q, result_point);

    size_t it = 0;
    for (size_t i = 0; i < loop_length; ++i)
    {
        doubling_step_for_flipped_miller_loop(work_point, lines.lines[it]);
        ++it;
        if (loop_bits[i] == 1)
        {
            mixed_addition_step_for_flipped_miller_loop(Q, work_point, lines.lines[it]);
            ++it;
        }
        else if (loop_bits[i] == 3)
        {
            mixed_addition_step_for_flipped_miller_loop(Q_neg, work_point, lines.lines[it]);
            ++it;
        }
    }

    g2::element Q1;
    g2::element Q2;
    mul_by_q(Q, Q1);
    mul_by_q(Q1, Q2);
    g2::__neg(Q2, Q2);
    // fq2::__neg(Q2.y, Q2.y);
    // fq2::__copy(Q2.x, Q2.x);
    // Q2.z = fq2::one;
    mixed_addition_step_for_flipped_miller_loop(Q1, work_point, lines.lines[it]);
    ++it;
    mixed_addition_step_for_flipped_miller_loop(Q2, work_point, lines.lines[it]);
}

fq12::field_t miller_loop(g1::element& P, miller_lines& lines)
{
    fq12::field_t work_scalar = fq12::one;

    size_t it = 0;
    fq12::ell_coeffs work_line;

    for (size_t i = 0; i < loop_length; ++i)
    {
        fq12::sqr(work_scalar, work_scalar);

        fq2::__copy(lines.lines[it].o, work_line.o);
        fq2::__mul_by_fq(P.y, lines.lines[it].vw, work_line.vw);
        fq2::__mul_by_fq(P.x, lines.lines[it].vv, work_line.vv);
        fq12::sparse_mul(work_scalar, work_line, work_scalar);
        ++it;

        if (loop_bits[i] != 0)
        {
            fq2::__copy(lines.lines[it].o, work_line.o);
            fq2::__mul_by_fq(P.y, lines.lines[it].vw, work_line.vw);
            fq2::__mul_by_fq(P.x, lines.lines[it].vv, work_line.vv);
            fq12::sparse_mul(work_scalar, work_line, work_scalar);
            ++it;
        }
    }

    fq2::__copy(lines.lines[it].o, work_line.o);
    fq2::__mul_by_fq(P.y, lines.lines[it].vw, work_line.vw);
    fq2::__mul_by_fq(P.x, lines.lines[it].vv, work_line.vv);
    fq12::sparse_mul(work_scalar, work_line, work_scalar);
    ++it;
    fq2::__copy(lines.lines[it].o, work_line.o);
    fq2::__mul_by_fq(P.y, lines.lines[it].vw, work_line.vw);
    fq2::__mul_by_fq(P.x, lines.lines[it].vv, work_line.vv);
    fq12::sparse_mul(work_scalar, work_line, work_scalar);
    ++it;
    return work_scalar;
}

fq12::field_t miller_loop_batch(const g1::element* points, const miller_lines* lines, size_t num_pairs)
{
    fq12::field_t work_scalar = fq12::one;

    size_t it = 0;
    fq12::ell_coeffs work_line;

    for (size_t i = 0; i < loop_length; ++i)
    {
        fq12::sqr(work_scalar, work_scalar);

        for (size_t j = 0; j < num_pairs; ++j)
        {
            fq2::__copy(lines[j].lines[it].o, work_line.o);
            fq2::__mul_by_fq(points[j].y, lines[j].lines[it].vw, work_line.vw);
            fq2::__mul_by_fq(points[j].x, lines[j].lines[it].vv, work_line.vv);
            fq12::sparse_mul(work_scalar, work_line, work_scalar);
        }
        ++it;
        if (loop_bits[i] != 0)
        {
            for (size_t j = 0; j < num_pairs; ++j)
            {
                fq2::__copy(lines[j].lines[it].o, work_line.o);
                fq2::__mul_by_fq(points[j].y, lines[j].lines[it].vw, work_line.vw);
                fq2::__mul_by_fq(points[j].x, lines[j].lines[it].vv, work_line.vv);
                fq12::sparse_mul(work_scalar, work_line, work_scalar);
            }
            ++it;
        }
    }

    for (size_t j = 0; j < num_pairs; ++j)
    {
        fq2::__copy(lines[j].lines[it].o, work_line.o);
        fq2::__mul_by_fq(points[j].y, lines[j].lines[it].vw, work_line.vw);
        fq2::__mul_by_fq(points[j].x, lines[j].lines[it].vv, work_line.vv);
        fq12::sparse_mul(work_scalar, work_line, work_scalar);
    }
    ++it;
    for (size_t j = 0; j < num_pairs; ++j)
    {
        fq2::__copy(lines[j].lines[it].o, work_line.o);
        fq2::__mul_by_fq(points[j].y, lines[j].lines[it].vw, work_line.vw);
        fq2::__mul_by_fq(points[j].x, lines[j].lines[it].vv, work_line.vv);
        fq12::sparse_mul(work_scalar, work_line, work_scalar);
    }
    ++it;
    return work_scalar;
}

void final_exponentiation_easy_part(const fq12::field_t& elt, fq12::field_t& r)
{
    fq12::field_t a;
    fq12::field_t b;

    fq12::copy(elt, a);
    fq6::__neg(a.c1, a.c1);
    fq12::invert(elt, b);
    fq12::mul(a, b, a);
    fq12::frobenius_map_two(a, b);
    fq12::mul(a, b, r);
}

void final_exponentiation_exp_by_neg_z(const fq12::field_t& elt, fq12::field_t& r)
{
    fq12::field_t scalar;
    fq12::copy(elt, scalar);
    fq12::copy(elt, r);

    for (size_t i = 0; i < neg_z_loop_length; ++i)
    {
        fq12::cyclotomic_squared(r, r);
        if (neg_z_loop_bits[i])
        {
            fq12::mul(r, scalar, r);
        }
    }
    fq12::unitary_inverse(r, r);
}

void final_exponentiation_tricky_part(const fq12::field_t& elt, fq12::field_t& r)
{
    fq12::field_t A;
    fq12::field_t B;
    fq12::field_t C;
    fq12::field_t D;
    fq12::field_t E;
    fq12::field_t F;
    fq12::field_t G;
    fq12::field_t H;
    fq12::field_t I;
    fq12::field_t J;
    fq12::field_t K;
    fq12::field_t L;
    fq12::field_t M;
    fq12::field_t N;
    fq12::field_t O;
    fq12::field_t P;
    fq12::field_t Q;
    fq12::field_t R;
    fq12::field_t S;
    fq12::field_t T;
    fq12::field_t U;

    final_exponentiation_exp_by_neg_z(elt, A);
    fq12::cyclotomic_squared(A, B);
    fq12::cyclotomic_squared(B, C);
    fq12::mul(C, B, D);

    final_exponentiation_exp_by_neg_z(D, E);
    fq12::cyclotomic_squared(E, F);

    final_exponentiation_exp_by_neg_z(F, G);
    fq12::unitary_inverse(D, H);
    fq12::unitary_inverse(G, I);
    fq12::mul(I, E, J);
    fq12::mul(H, J, K);
    fq12::mul(B, K, L);
    fq12::mul(E, K, M);
    fq12::mul(M, elt, N);
    fq12::frobenius_map_one(L, O);
    fq12::mul(O, N, P);
    fq12::frobenius_map_two(K, Q);
    fq12::mul(P, Q, R);
    fq12::unitary_inverse(elt, S);
    fq12::mul(L, S, T);
    fq12::frobenius_map_three(T, U);
    fq12::mul(R, U, r);
}

fq12::field_t reduced_ate_pairing(const g1::affine_element& P_affine, const g2::affine_element& Q_affine)
{
    g1::element P;
    g2::element Q;
    g1::affine_to_jacobian(P_affine, P);
    g2::affine_to_jacobian(Q_affine, Q);

    miller_lines lines;
    precompute_miller_lines(Q, lines);

    fq12::field_t result = miller_loop(P, lines);
    final_exponentiation_easy_part(result, result);
    final_exponentiation_tricky_part(result, result);
    return result;
}

fq12::field_t
reduced_ate_pairing_batch_precomputed(const g1::affine_element* P_affines, const miller_lines* lines, size_t num_points)
{
    g1::element* P = new g1::element[num_points];
    for (size_t i = 0; i < num_points; ++i)
    {
        g1::affine_to_jacobian(P_affines[i], P[i]);
    }
    fq12::field_t result = miller_loop_batch(&P[0], &lines[0], num_points);
    final_exponentiation_easy_part(result, result);
    final_exponentiation_tricky_part(result, result);
    delete[] P;
    return result;
}

fq12::field_t
reduced_ate_pairing_batch(const g1::affine_element* P_affines, const g2::affine_element* Q_affines, size_t num_points)
{
    g1::element* P = new g1::element[num_points];
    g2::element* Q = new g2::element[num_points];
    miller_lines* lines = new miller_lines[num_points];
    for (size_t i = 0; i < num_points; ++i)
    {
        g1::affine_to_jacobian(P_affines[i], P[i]);
        g2::affine_to_jacobian(Q_affines[i], Q[i]);

        precompute_miller_lines(Q[i], lines[i]);
    }

    fq12::field_t result = miller_loop_batch(&P[0], &lines[0], num_points);
    final_exponentiation_easy_part(result, result);
    final_exponentiation_tricky_part(result, result);
    delete[] P;
    delete[] Q;
    delete[] lines;
    return result;
}

} // namespace pairing
} // namespace barretenberg
