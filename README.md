![AssemblyScript](https://raw.githubusercontent.com/dcodeIO/AssemblyScript/master/logo.png)
==============
AssemblyScript defines a subset of [TypeScript](https://github.com/Microsoft/TypeScript) that it compiles to [WebAssembly](http://webassembly.org/). The compiler itself is written in TypeScript and no binary dependencies are required to get started. Under the hood, it rewires TypeScript's [compiler API](https://github.com/Microsoft/TypeScript-wiki/blob/master/Using-the-Compiler-API.md) to [Binaryen](https://github.com/WebAssembly/binaryen)'s compiler backend.

Be warned that this is an early prototype and that it cannot do anything useful yet.

An initial playground to mess with the current state of the compiler is available at [dcode.io/AssemblyScript](http://dcode.io/AssemblyScript/).

Example
-------

```ts
export function add(a: int, b: double): short {
  return (a + (b as int)) as short;
}
```

Compiles to:

```s
(module
 (type $iFi (func (param i32 f64) (result i32)))
 (memory $0 256)
 (export "memory" (memory $0))
 (export "add" (func $add))
 (func $add (type $iFi) (param $0 i32) (param $1 f64) (result i32)
  (return
   (i32.shl
    (i32.shr_s
     (i32.add
      (get_local $0)
      (i32.trunc_s/f64
       (get_local $1)
      )
     )
     (i32.const 16)
    )
    (i32.const 16)
   )
  )
 )
)
```

See the pre-configured [example project](./examples/project) for a quickstart.

### Running a module

The package also provides a convenient [stand-alone loader component](./lib/loader) to run and work with compiled WebAssembly modules:

```ts
import load from "assemblyscript/loader"; // JS: var load = require("assemblyscript/loader").load;

load("path/to/module.wasm").then(module => {
  ...
});
```

Usage
-----
An AssemblyScript program is valid TypeScript syntactically, but not necessarily semantically.

WebAssembly-specific types are obtained by referencing [assembly.d.ts](./assembly.d.ts):

Type      | Alias     | Native type | sizeof | Description
----------|-----------|-------------|--------|-------------
`sbyte`   | `int8`    | i32         | 1      | An 8-bit signed integer.
`byte`    | `uint8`   | i32         | 1      | An 8-bit unsigned integer.
`short`   | `int16`   | i32         | 2      | A 16-bit signed integer.
`ushort`  | `uint16`  | i32         | 2      | A 16-bit unsigned integer.
`int`     | `int32`   | i32         | 4      | A 32-bit signed integer.
`uint`    | `uint32`  | i32         | 4      | A 32-bit unsigned integer.
`long`    | `int64`   | i64         | 8      | A 64-bit signed integer.
`ulong`   | `uint64`  | i64         | 8      | A 64-bit unsigned integer.
`uintptr` | -         | i32 / i64   | 4 / 8  | A 32-bit unsigned integer when targeting 32-bit WebAssembly.<br />A 64-bit unsigned integer when targeting 64-bit WebAssembly.
`float`   | `float32` | f32         | 4      | A 32-bit float.
`double`  | `float64` | f64         | 8      | A 64-bit float.
`bool`    | -         | i32         | 1      | A 1-bit unsigned _integer_.
`void`    | -         | none        | -      | No return type

While generating a warning to avoid type confusion, the JavaScript types `number` and `boolean` resolve to `double` and `bool` respectively.

WebAssembly-specific operations are available as built-in functions that translate to the respective opcode directly:

* **rotl**(value: `int`, shift: `int`): `int`<br />
  Performs the sign-agnostic rotate left operation on a 32-bit integer.
* **rotll**(value: `long`, shift: `long`): `long`<br />
  Performs the sign-agnostic rotate left operation on a 64-bit integer.
* **rotr**(value: `int`, shift: `int`): `int`<br />
  Performs the sign-agnostic rotate right operation on a 32-bit integer.
* **rotrl**(value: `long`, shift: `long`): `long`<br />
  Performs the sign-agnostic rotate right operation on a 64-bit integer.
* **clz**(value: `int`): `int`<br />
  Performs the sign-agnostic count leading zero bits operation on a 32-bit integer. All zero bits are considered leading if the value is zero.
* **clzl**(value: `long`): `long`<br />
  Performs the sign-agnostic count leading zero bits operation on a 64-bit integer. All zero bits are considered leading if the value is zero.
* **ctz**(value: `int`): `int`<br />
  Performs the sign-agnostic count tailing zero bits operation on a 32-bit integer. All zero bits are considered trailing if the value is zero.
* **ctzl**(value: `long`): `long`<br />
  Performs the sign-agnostic count trailing zero bits operation on a 64-bit integer. All zero bits are considered trailing if the value is zero.
* **popcnt**(value: `int`): `int`<br />
  Performs the sign-agnostic count number of one bits operation on a 32-bit integer.
* **popcntl**(value: `long`): `long`<br />
  Performs the sign-agnostic count number of one bits operation on a 64-bit integer.
* **abs**(value: `double`): `double`<br />
  Computes the absolute value of a 64-bit float.
* **absf**(value: `float`): `float`<br />
  Computes the absolute value of a 32-bit float.
* **ceil**(value: `double`): `double`<br />
  Performs the ceiling operation on a 64-bit float.
* **ceilf**(value: `float`): `float`<br />
  Performs the ceiling operation on a 32-bit float.
* **floor**(value: `double`): `double`<br />
  Performs the floor operation on a 64-bit float.
* **floorf**(value: `float`): `float`<br />
  Performs the floor operation on a 32-bit float.
* **sqrt**(value: `double`): `double`<br />
  Calculates the square root of a 64-bit float.
* **sqrtf**(value: `float`): `float`<br />
  Calculates the square root of a 32-bit float.
* **trunc**(value: `double`): `double`<br />
  Rounds to the nearest integer towards zero of a 64-bit float.
* **truncf**(value: `float`): `float`<br />
  Rounds to the nearest integer towards zero of a 32-bit float.
* **nearest**(value: `double`): `double`<br />
  Rounds to the nearest integer tied to even of a 64-bit float.
* **nearestf**(value: `float`): `float`<br />
  Rounds to the nearest integer tied to even of a 32-bit float.
* **min**(left: `double`, right: `double`): `double`<br />
  Determines the minimum of two 64-bit floats. If either operand is `NaN`, returns `NaN`.
* **minf**(left: `float`, right: `float`): `float`<br />
  Determines the minimum of two 32-bit floats. If either operand is `NaN`, returns `NaN`.
* **max**(left: `double`, right: `double`): `double`<br />
  Determines the maximum of two 64-bit floats. If either operand is `NaN`, returns `NaN`.
* **maxf**(left: `float`, right: `float`): `float`<br />
  Determines the maximum of two 32-bit floats. If either operand is `NaN`, returns `NaN`.
* **copysign**(x: `double`, y: `double`): `double`<br />
  Composes a 64-bit float from the magnitude of `x` and the sign of `y`.
* **copysignf**(x: `float`, y: `float`): `float`<br />
  Composes a 32-bit float from the magnitude of `x` and the sign of `y`.
* **reinterpreti**(value: `float`): `int`<br />
  Reinterprets the bits of a 32-bit float as a 32-bit integer.
* **reinterpretl**(value: `double`): `long`<br />
  Reinterprets the bits of a 64-bit float as a 64-bit integer.
* **reinterpretf**(value: `int`): `float`<br />
  Reinterprets the bits of a 32-bit integer as a 32-bit float.
* **reinterpretd**(value: `long`): `double`<br />
  Reinterprets the bits of a 64-bit integer as a 64-bit double.
* **current_memory**(): `int`<br />
  Returns the current memory size in units of pages. One page is 64kb.
* **grow_memory**(value: `uint`): `int`<br />
  Grows linear memory by a given unsigned delta of pages. One page is 64kb. Returns the previous memory size in units of pages or `-1` on failure.
* **sizeof**<`T`>(): `uintptr`<br />
  Returns the byte size of the specified core or class type. Compiles to a constant.

The following built-in constants are present as immutable globals (note that optimizers might inline them):

* **NaN**: `double`<br />
  NaN (not a number) as a 64-bit float.
* **NaNf**: `float`<br />
  NaN (not a number) as a 32-bit float.
* **Infinity**: `double`<br />
  Positive infinity as a 64-bit float.
* **Infinityf**: `float`<br />
  Positive infinity as a 32-bit float.

By default (i.e. if the `--nolib` option isn't set), standard memory management routines based on [dlmalloc](http://g.oswego.edu/dl/html/malloc.html) and [musl](http://www.musl-libc.org/) will be linked statically and exported to the embedder:

* **malloc**(size: `uintptr`): `uintptr`<br />
  Allocates a chunk of memory of the specified size and returns a pointer to it.
* **free**(ptr: `uintptr`): `void`<br />
  Frees a previously allocated chunk of memory by its pointer.
* **memcpy**(dest: `uintptr`, src: `uintptr`, size: `uintptr`): `uintptr`<br />
  Copies data from one chunk of memory to another.
* **memset**(dest: `uintptr`, c: `int`, size: `uintptr`): `uintptr`<br />
  Sets a chunk of memory to the provided value `c`. Usually used to reset it to all `0`s.
* **memcmp**(vl: `uintptr`, vr: `uintptr`, n: `uintptr`): `int`<br />
  Compares a chunk of memory to another. Returns `0` if both are equal, otherwise `vl[i] - vr[i]` at the first difference's byte offset `i`.

Linking in memory management routines adds about 11kb to a module. Once WebAssembly exposes the garbage collector natively, there'll be other options as well. Note that the `new` operator depends on `malloc` and will break when `--nolib` is specified (and no other `malloc` is present). Also note that calling `grow_memory` where `malloc` is present will most likely break `malloc` as it expects contiguous memory.

Type coercion requires an explicit cast where precision or signage is lost respectively is implicit where it is maintained. For example, to cast a `double` to an `int`:

```ts
function example(value: double): int {
  return value as int; // translates to the respective opcode
}
```

Global WebAssembly imports can be `declare`d anywhere while WebAssembly exports are `export`ed from the entry file (the file specified when calling `asc` or `Compiler.compile`). Aside from that, imports and exports work just like in TypeScript.

```ts
// entry.ts

import { myOtherExportThatDoesntBecomeAWebAssemblyExport } from "./imported";

declare function myImport(): void;

export function myExport(): void {
  myOtherExportThatDoesntBecomeAWebAssemblyExport();
}
```

Currently, imports can also be pulled from different namespaces by separating the namespace and the function with a `$` character.

```ts
declare function Math$random(): double;
```

Naming a function `start` with no arguments and a `void` return type will automatically make it the start function that is being called on load even before returning to the embedder.

```ts
function start(): void {
  ...
}
```

API
---

* **Compiler.compileFile**(filename: `string`, options?: `CompilerOptions`): `binaryen.Module | null`<br />
  Compiles the specified entry file to a WebAssembly module. Returns `null` on failure.

* **Compiler.compileString**(source: `string`, options?: `CompilerOptions`): `binaryen.Module | null`<br />
  Compiles the specified entry file source to a WebAssembly module. Returns `null` on failure.

* **Compiler.lastDiagnostics**: `typescript.Diagnostic[]`<br />
  Contains the diagnostics generated by the last invocation of `compilerFile` or `compileString`.

* **CompilerOptions**<br />
  AssemblyScript compiler options.

  * **uintptrSize**: `number`<br />
    Specifies the byte size of a pointer. 32-bit WebAssembly expects `4`, 64-bit WebAssembly expects `8`. Defaults to `4`.
  * **noLib**: `boolean`<br />
    Specifies whether the standard library (malloc, free, etc.) shall be excluded. Defaults to `false`.
  * **silent**: `boolean`<br />
    Specifies that compilation shall be performed in silent mode without writing to stderr. Defaults to `false`.
  * **treeShaking**: `boolean`<br />
    Disables built-in tree-shaking if set to `false`. Defaults to `true`.

### Example

```ts
import { Compiler, typescript } from "assemblyscript";

const module = Compiler.compileString(`
export function add(a: int, b: int): int {
  return a + b;
}
`, {
  uintptrSize: 4,
  silent: true
});

console.error(typescript.formatDiagnostics(Compiler.lastDiagnostics));
if (!module)
  throw Error("compilation failed");

module.optimize();

if (!module.validate())
  throw Error("validation failed");

const textFile = module.emitText();
const wasmFile = module.emitBinary();
...
```

Command line
------------

The command line compiler `asc` works similar to TypeScript's `tsc`:

```
Syntax: asc [options] [file ...]

Options:
 -o, --out, --outFile   Specifies the output file name.
 -v, --validate         Validates the module.
 -O, --optimize         Runs optimizing binaryen IR passes.
 -t, --text             Emits text format instead of a binary.
```

---

That's it for now. Feel free to experiment. PRs welcome!

License: [Apache License, Version 2.0](https://opensource.org/licenses/Apache-2.0)
