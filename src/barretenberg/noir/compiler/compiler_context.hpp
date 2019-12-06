#pragma once
#include "symbol_table.hpp"
#include <map>

namespace noir {
namespace code_gen {

typedef std::map<std::string const, ast::function_declaration> FunctionMap;

struct CompilerContext {
    CompilerContext(Composer& composer)
        : composer(composer)
    {}
    Composer& composer;
    SymbolTable symbol_table;
    FunctionMap functions;
};

} // namespace code_gen
} // namespace noir