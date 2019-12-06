#pragma once
#include "var_t.hpp"
#include <iostream>

namespace noir {
namespace code_gen {

class SymbolTable {
    typedef std::map<std::string const, var_t> ScopeMap;

  public:
    SymbolTable() { push(); }

    template <typename T> void operator()(T const& var, std::string const& key)
    {
        auto existing = lookup(key);
        if (existing.has_value()) {
            var_t& v = (*existing.value()).second;
            if (!boost::get<T>(&v)) {
                throw std::runtime_error(std::string("Cannot assign, incompatible types: ") + typeid(T).name());
            }
            std::cout << "SYMBOL TABLE UPDATE: " << key << std::endl;
            v = var;
        } else {
            throw std::runtime_error("Symbol not found: " + key);
        }
    }

    void set(var_t const& var, std::string const& key)
    {
        boost::apply_visitor(*this, var, boost::variant<std::string const>(key));
    }

    void declare(var_t const& var, std::string const& key)
    {
        if (variables_.back().find(key) != variables_.back().end()) {
            throw std::runtime_error("Symbol already defined in current scope: " + key);
        }
        std::cout << "SYMBOL TABLE ADD: " << key << std::endl;
        variables_.back()[key] = var;
    }

    var_t const& operator[](std::string const& key)
    {
        auto it = lookup(key);
        if (it.has_value()) {
            return (*(it.value())).second;
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