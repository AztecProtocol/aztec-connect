# Default Exports

Don't ever use default exports, except when using a third party libraries that provides no alternative.
It leads to naming confusions, and robs the compiler of various insights.

### Yes Example

```typescript
// my_class.ts
export class MyClass {}

// lib.ts
import { MyClass } from './my_class';
```

### No Example

```typescript
// my_class.ts
export default class MyClass {}

// lib.ts
import MyClass from './my_class';
```
