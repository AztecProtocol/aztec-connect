#pragma once
#include "../../waffle/proof_system/prover/prover.hpp"
#include "../ast.hpp"
#include "compiler_context.hpp"
#include "var_t.hpp"

namespace noir {
namespace code_gen {

class compiler {
  public:
    typedef void result_type;

    compiler(Composer& composer);

    waffle::Prover start(ast::statement_list const& x);

    std::pair<var_t, waffle::Prover> start(ast::statement_list const& x, std::vector<var_t> const& args);

    void operator()(ast::variable_declaration const& x);
    void operator()(ast::function_declaration const& x);
    void operator()(ast::statement const& x);
    void operator()(ast::statement_list const& x);

  private:
    var_t call(std::string const& function_name, std::vector<var_t> const& args);

  private:
    CompilerContext ctx_;
};

} // namespace code_gen
} // namespace noir
