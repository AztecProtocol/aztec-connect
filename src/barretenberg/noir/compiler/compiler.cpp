#include "compiler.hpp"
#include "expression_visitor.hpp"
#include "function_call.hpp"
#include "function_statement_visitor.hpp"
#include "type_info_from.hpp"
#include "var_t.hpp"
#include <boost/assert.hpp>
#include <boost/format.hpp>
#include <boost/variant/apply_visitor.hpp>
#include <iostream>
#include <set>

namespace noir {
namespace code_gen {

Compiler::Compiler(waffle::StandardComposer& composer)
    : ctx_(composer)
{}

void Compiler::operator()(ast::variable_declaration const& x)
{
    auto ti = type_info_from_type_id(ctx_, x.type);
    std::cout << "global variable declaration " << ti << " " << x.variable << std::endl;

    var_t v = var_t_factory(ti, ctx_.composer);
    std::cout << v << std::endl;
    ctx_.symbol_table.declare(v, x.variable);

    if (!x.assignment.has_value()) {
        throw std::runtime_error("Global variables must be defined.");
    }

    ast::assignment assign = { .lhs = x.variable, .rhs = x.assignment.value() };
    ExpressionVisitor(ctx_, v.type)(assign);
}

void Compiler::operator()(ast::function_declaration const& x)
{
    std::cout << "function declaration: " << x.name << std::endl;
    ctx_.functions[x.name] = x;
}

void Compiler::operator()(ast::statement const& x)
{
    std::cout << "statement" << std::endl;
    boost::apply_visitor(*this, x);
}

void Compiler::operator()(ast::statement_list const& x)
{
    for (auto const& s : x) {
        (*this)(s);
    }
}

std::pair<var_t, waffle::Prover> Compiler::start(ast::statement_list const& x, std::vector<var_t> const& args)
{
    // Parse top level statements, after which we can reference "main" function.
    (*this)(x);

    var_t result = function_call(ctx_, "main", args);

    auto prover = ctx_.composer.preprocess();
    printf("prover gates = %lu\n", prover.n);
    printf("composer gates = %lu\n", ctx_.composer.get_num_gates());
    return std::make_pair(std::move(result), std::move(prover));
}

} // namespace code_gen
} // namespace noir