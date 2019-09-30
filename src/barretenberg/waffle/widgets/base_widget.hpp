#ifndef BASE_WIDGET_HPP
#define BASE_WIDGET_HPP

#include "stddef.h"

namespace waffle
{
class base_widget
{
public:

base_widget(const size_t&) {}

base_widget(const base_widget &) {}

virtual base_widget& operator=(const base_widget &) {}

virtual base_widget& operator=(base_widget &&) {}

virtual ~base_widget() {}

private:
};
}

#endif