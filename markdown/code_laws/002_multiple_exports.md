# Multiple exports

Keep code in singular files strongly related. Favour a singular (or a low number) of exports, with the rest of the code being private. E.g. a single class export, or free function. If necessary, some types may also be exported. Consider what is exported from the file, as the "public interface" to that module. Name the file after it's primary export. If there is a lot of private code, consider creating a directory and breaking the private code into its own files. Only expose the public interface via `index.ts`.
