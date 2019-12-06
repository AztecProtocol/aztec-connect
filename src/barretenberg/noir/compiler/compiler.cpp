#include "compiler.hpp"
#include "expression_visitor.hpp"
#include "function_statement_visitor.hpp"
#include "var_t.hpp"
#include <boost/assert.hpp>
#include <boost/format.hpp>
#include <boost/variant/apply_visitor.hpp>
#include <iostream>
#include <set>

namespace noir {
namespace code_gen {

compiler::compiler(waffle::StandardComposer& composer)
    : ctx_(composer)
{}

void compiler::operator()(ast::variable_declaration const& x)
{
    std::cout << "variable declaration " << x.variable << std::endl;

    var_t v = var_t_factory(x, ctx_.composer);
    ctx_.symbol_table.declare(v, x.variable);

    if (x.assignment.has_value()) {
        ast::assignment assign = { .lhs = x.variable, .rhs = x.assignment.value() };
        ExpressionVisitor ev(ctx_);
        ev(assign);
    }
}

void compiler::operator()(ast::function_declaration const& x)
{
    std::cout << "function declaration: " << x.name << std::endl;
    ctx_.functions[x.name] = x;
}

void compiler::operator()(ast::statement const& x)
{
    std::cout << "statement" << std::endl;
    boost::apply_visitor(*this, x);
}

void compiler::operator()(ast::statement_list const& x)
{
    for (auto const& s : x) {
        (*this)(s);
    }
}

var_t compiler::call(std::string const& function_name, std::vector<var_t> const& args)
{
    if (ctx_.functions.find(function_name) == ctx_.functions.end()) {
        throw std::runtime_error("Function not found: " + function_name);
    }

    auto func = ctx_.functions[function_name];

    if (args.size() != func.args.size()) {
        throw std::runtime_error(
            (boost::format("Function call has incorrect number of arguments. Expected %d, received %d.") %
             func.args.size() % args.size())
                .str());
    }

    ctx_.symbol_table.push();

    for (size_t i = 0; i < func.args.size(); ++i) {
        ctx_.symbol_table.set(args[i], func.args[i].name);
    }

    FunctionStatementVisitor fsv(ctx_);
    var_t result = fsv(func.statements.get());
    ctx_.symbol_table.pop();
    return result;
}

waffle::Prover compiler::start(ast::statement_list const& x)
{
    // Parse top level statements, after which we can reference "main" function.
    (*this)(x);

    auto prover = ctx_.composer.preprocess();
    printf("prover gates = %lu\n", prover.n);
    printf("composer gates = %lu\n", ctx_.composer.n);
    return prover;
}

std::pair<var_t, waffle::Prover> compiler::start(ast::statement_list const& x, std::vector<var_t> const& args)
{
    // Parse top level statements, after which we can reference "main" function.
    (*this)(x);

    var_t result = call("main", args);

    auto prover = ctx_.composer.preprocess();
    printf("prover gates = %lu\n", prover.n);
    printf("composer gates = %lu\n", ctx_.composer.n);
    return std::make_pair(std::move(result), std::move(prover));
}

} // namespace code_gen
} // namespace noir