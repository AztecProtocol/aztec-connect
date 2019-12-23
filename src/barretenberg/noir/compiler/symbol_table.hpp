#pragma once
#include "log.hpp"
#include "var_t.hpp"
#include <iostream>
#include <map>

namespace noir {
namespace code_gen {

class SymbolTable {
    typedef std::map<std::string const, var_t> ScopeMap;

  public:
    SymbolTable() { push(); }

    void set(var_t const& var, std::string const& key)
    {
        auto existing = lookup(key);
        if (existing.has_value()) {
            var_t& e = (*existing.value()).second;
            auto e_type = e.type.type_name();
            auto v_type = var.type.type_name();
            if (e_type != v_type) {
                throw std::runtime_error(
                    format("Cannot assign value with type %s to variable %s with type %s.", v_type, key, e_type));
            }
            debug("SYMBOL TABLE UPDATE: %1%", key);
            e = var;
        } else {
            throw std::runtime_error("Symbol not found: " + key);
        }
    }

    void declare(var_t const& var, std::string const& key)
    {
        if (variables_.back().find(key) != variables_.back().end()) {
            throw std::runtime_error("Symbol already defined in current scope: " + key);
        }
        debug("SYMBOL TABLE ADD: %1%", key);
        variables_.back().insert(std::make_pair(key, var));
    }

    var_t operator[](std::string const& key)
    {
        auto it = lookup(key);
        if (it.has_value()) {
            return var_t_ref((*(it.value())).second);
        }
        throw std::runtime_error("Symbol not found: " + key);
    }

    void push() { variables_.push_back(ScopeMap()); }

    void pop() { variables_.pop_back(); }

  private:
    std::optional<ScopeMap::iterator> lookup(std::string const& key)
    {
        for (auto it = variables_.rbegin(); it != variables_.rend(); ++it) {
            auto var = (*it).find(key);
            if (var == (*it).end()) {
                continue;
            } else {
                return var;
            }
        }
        return {};
    }

  private:
    std::vector<ScopeMap> variables_;
};
} // namespace code_gen
} // namespace noir