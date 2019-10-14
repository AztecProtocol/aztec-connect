#include "./pairing.hpp"

#include "../groups/g2.hpp"
#include "../fields/fq12.hpp"
#include "../groups/g1.hpp"

namespace barretenberg
{
namespace pairing
{


void doubling_step_for_flipped_miller_loop(g2::element &current, pairing::ell_coeffs &ell)
{
    fq2::fq2_t a;
    fq2::fq2_t b;
    fq2::fq2_t c;
    fq2::fq2_t d;
    fq2::fq2_t e;
    fq2::fq2_t ee;
    fq2::fq2_t f;
    fq2::fq2_t g;
    fq2::fq2_t h;
    fq2::fq2_t i;
    fq2::fq2_t j;
    fq2::fq2_t k;

    fq2::mul_by_fq(fq::two_inv, current.x, a);
    fq2::mul(a, current.y, a);

    fq2::sqr(current.y, b);
    fq2::sqr(current.z, c);
    fq2::add(c, c, d);
    fq2::add(d, c, d);
    fq2::mul(fq2::twist_coeff_b, d, e);
    fq2::add(e, e, f);

    fq2::add(f, e, f);

    fq2::add(b, f, g);
    fq2::mul_by_fq(fq::two_inv, g, g);

    fq2::add(current.y, current.z, h);
    fq2::sqr(h, h);
    fq2::add(b, c, i);
    fq2::sub(h, i, h);
    fq2::sub(e, b, i);
    fq2::sqr(current.x, j);

    fq2::sqr(e, ee);

    fq2::sub(b, f, k);
    fq2::mul(a, k, current.x);

    fq2::add(ee, ee, k);
    fq2::add(k, ee, k);
    fq2::sqr(g, c);
    fq2::sub(c, k, current.y);

    fq2::mul(b, h, current.z);

    fq6::mul_by_non_residue(i, ell.o);
    fq2::neg(h, ell.vw);
    fq2::add(j, j, ell.vv);
    fq2::add(ell.vv, j, ell.vv);
}

void mixed_addition_step_for_flipped_miller_loop(const g2::element &base, g2::element &Q, pairing::ell_coeffs &line)
{
    fq2::fq2_t d;
    fq2::fq2_t e;
    fq2::fq2_t f;
    fq2::fq2_t g;
    fq2::fq2_t h;
    fq2::fq2_t i;
    fq2::fq2_t j;

    fq2::mul(base.x, Q.z, d);
    fq2::sub(Q.x, d, d);

    fq2::mul(base.y, Q.z, e);
    fq2::sub(Q.y, e, e);

    fq2::sqr(d, f);
    fq2::sqr(e, g);
    fq2::mul(d, f, h);
    fq2::mul(Q.x, f, i);

    fq2::mul(Q.z, g, j);
    fq2::add(j, h, j);
    fq2::sub(j, i, j);
    fq2::sub(j, i, j);

    fq2::mul(d, j, Q.x);
    fq2::sub(i, j, i);
    fq2::mul(i, e, i);
    fq2::mul(Q.y, h, j);
    fq2::sub(i, j, Q.y);
    fq2::mul(Q.z, h, Q.z);

    fq2::mul(e, base.x, h);
    fq2::mul(d, base.y, i);
    fq2::sub(h, i, h);
    fq6::mul_by_non_residue(h, line.o);
    fq2::neg(e, line.vv);
    fq2::copy(d, line.vw);
}

void precompute_miller_lines(const g2::element &Q, miller_lines &lines)
{
    g2::element Q_neg;
    fq2::copy(Q.x, Q_neg.x);
    fq2::neg(Q.y, Q_neg.y);
    Q_neg.z = fq2::one();
    // g2::neg(Q, Q_neg);
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
    g2::mul_by_q(Q, Q1);
    g2::mul_by_q(Q1, Q2);
    g2::neg(Q2, Q2);
    // fq2::neg(Q2.y, Q2.y);
    // fq2::copy(Q2.x, Q2.x);
    // Q2.z = fq2::one();
    mixed_addition_step_for_flipped_miller_loop(Q1, work_point, lines.lines[it]);
    ++it;
    mixed_addition_step_for_flipped_miller_loop(Q2, work_point, lines.lines[it]);
}

fq12::fq12_t miller_loop(g1::element &P, miller_lines &lines)
{
    fq12::fq12_t work_scalar = fq12::one();

    size_t it = 0;
    pairing::ell_coeffs work_line;

    for (size_t i = 0; i < loop_length; ++i)
    {
        fq12::sqr(work_scalar, work_scalar);

        fq2::copy(lines.lines[it].o, work_line.o);
        fq2::mul_by_fq(P.y, lines.lines[it].vw, work_line.vw);
        fq2::mul_by_fq(P.x, lines.lines[it].vv, work_line.vv);
        fq12::sparse_mul(work_scalar, work_line, work_scalar);
        ++it;

        if (loop_bits[i] != 0)
        {
            fq2::copy(lines.lines[it].o, work_line.o);
            fq2::mul_by_fq(P.y, lines.lines[it].vw, work_line.vw);
            fq2::mul_by_fq(P.x, lines.lines[it].vv, work_line.vv);
            fq12::sparse_mul(work_scalar, work_line, work_scalar);
            ++it;
        }
    }

    fq2::copy(lines.lines[it].o, work_line.o);
    fq2::mul_by_fq(P.y, lines.lines[it].vw, work_line.vw);
    fq2::mul_by_fq(P.x, lines.lines[it].vv, work_line.vv);
    fq12::sparse_mul(work_scalar, work_line, work_scalar);
    ++it;
    fq2::copy(lines.lines[it].o, work_line.o);
    fq2::mul_by_fq(P.y, lines.lines[it].vw, work_line.vw);
    fq2::mul_by_fq(P.x, lines.lines[it].vv, work_line.vv);
    fq12::sparse_mul(work_scalar, work_line, work_scalar);
    ++it;
    return work_scalar;
}

fq12::fq12_t miller_loop_batch(g1::element *points, miller_lines *lines, size_t num_pairs)
{
    fq12::fq12_t work_scalar = fq12::one();

    size_t it = 0;
    pairing::ell_coeffs work_line;

    for (size_t i = 0; i < loop_length; ++i)
    {
        fq12::sqr(work_scalar, work_scalar);

        for (size_t j = 0; j < num_pairs; ++j)
        {
            fq2::copy(lines[j].lines[it].o, work_line.o);
            fq2::mul_by_fq(points[j].y, lines[j].lines[it].vw, work_line.vw);
            fq2::mul_by_fq(points[j].x, lines[j].lines[it].vv, work_line.vv);
            fq12::sparse_mul(work_scalar, work_line, work_scalar);
        }
        ++it;
        if (loop_bits[i] != 0)
        {
            for (size_t j = 0; j < num_pairs; ++j)
            {
                fq2::copy(lines[j].lines[it].o, work_line.o);
                fq2::mul_by_fq(points[j].y, lines[j].lines[it].vw, work_line.vw);
                fq2::mul_by_fq(points[j].x, lines[j].lines[it].vv, work_line.vv);
                fq12::sparse_mul(work_scalar, work_line, work_scalar);
            }
            ++it;
        }
    }

    for (size_t j = 0; j < num_pairs; ++j)
    {
        fq2::copy(lines[j].lines[it].o, work_line.o);
        fq2::mul_by_fq(points[j].y, lines[j].lines[it].vw, work_line.vw);
        fq2::mul_by_fq(points[j].x, lines[j].lines[it].vv, work_line.vv);
        fq12::sparse_mul(work_scalar, work_line, work_scalar);
    }
    ++it;
    for (size_t j = 0; j < num_pairs; ++j)
    {
        fq2::copy(lines[j].lines[it].o, work_line.o);
        fq2::mul_by_fq(points[j].y, lines[j].lines[it].vw, work_line.vw);
        fq2::mul_by_fq(points[j].x, lines[j].lines[it].vv, work_line.vv);
        fq12::sparse_mul(work_scalar, work_line, work_scalar);
    }
    ++it;
    return work_scalar;
}

void final_exponentiation_easy_part(const fq12::fq12_t &elt, fq12::fq12_t &r)
{
    fq12::fq12_t a;
    fq12::fq12_t b;

    fq12::copy(elt, a);
    fq6::neg(a.c1, a.c1);
    fq12::invert(elt, b);
    fq12::mul(a, b, a);
    fq12::frobenius_map_two(a, b);
    fq12::mul(a, b, r);
}

void final_exponentiation_exp_by_neg_z(const fq12::fq12_t &elt, fq12::fq12_t &r)
{
    fq12::fq12_t scalar;
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

void final_exponentiation_tricky_part(const fq12::fq12_t &elt, fq12::fq12_t &r)
{
    fq12::fq12_t A;
    fq12::fq12_t B;
    fq12::fq12_t C;
    fq12::fq12_t D;
    fq12::fq12_t E;
    fq12::fq12_t F;
    fq12::fq12_t G;
    fq12::fq12_t H;
    fq12::fq12_t I;
    fq12::fq12_t J;
    fq12::fq12_t K;
    fq12::fq12_t L;
    fq12::fq12_t M;
    fq12::fq12_t N;
    fq12::fq12_t O;
    fq12::fq12_t P;
    fq12::fq12_t Q;
    fq12::fq12_t R;
    fq12::fq12_t S;
    fq12::fq12_t T;
    fq12::fq12_t U;

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

fq12::fq12_t reduced_ate_pairing(const g1::affine_element &P_affine, const g2::affine_element &Q_affine)
{
    g1::element P;
    g2::element Q;
    g1::affine_to_jacobian(P_affine, P);
    g2::affine_to_jacobian(Q_affine, Q);

    miller_lines lines;
    precompute_miller_lines(Q, lines);

    fq12::fq12_t result = miller_loop(P, lines);
    final_exponentiation_easy_part(result, result);
    final_exponentiation_tricky_part(result, result);
    return result;
}

fq12::fq12_t reduced_ate_pairing_batch(const g1::affine_element *P_affines, const g2::affine_element *Q_affines, size_t num_points)
{
    g1::element *P = new g1::element[num_points];
    g2::element *Q = new g2::element[num_points];
    miller_lines *lines = new miller_lines[num_points];
    for (size_t i = 0; i < num_points; ++i)
    {
        g1::affine_to_jacobian(P_affines[i], P[i]);
        g2::affine_to_jacobian(Q_affines[i], Q[i]);

        precompute_miller_lines(Q[i], lines[i]);
    }

    fq12::fq12_t result = miller_loop_batch(&P[0], &lines[0], num_points);
    final_exponentiation_easy_part(result, result);
    final_exponentiation_tricky_part(result, result);
    delete P;
    delete Q;
    delete lines;
    return result;
}

} // namespace pairing
} // namespace barretenberg
