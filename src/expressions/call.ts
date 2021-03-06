import * as binaryen from "../binaryen";
import * as builtins from "../builtins";
import Compiler from "../compiler";
import * as reflection from "../reflection";
import * as typescript from "../typescript";

export function compileCall(compiler: Compiler, node: typescript.CallExpression, contextualType: reflection.Type): binaryen.Expression {
  const op = compiler.module;
  const signature = compiler.checker.getResolvedSignature(node);
  if (!signature) {
    compiler.error(node, "Unresolvable call target");
    return op.unreachable();
  }

  // Initialize generic function from type arguments
  const declaration = <typescript.FunctionLikeDeclaration>signature.declaration; // FunctionLikeDeclaration extends SignatureDeclaration
  let instance = typescript.getReflectedFunction(declaration);
  if (!instance) {
    const template = typescript.getReflectedFunctionTemplate(declaration);
    if (template) {
      instance = template.resolve(compiler, node.typeArguments || []);
      instance.initialize(compiler);
      if (!template.isGeneric)
        typescript.setReflectedFunction(declaration, instance);
    } else {
      compiler.error(node, "Unresolvable call target", typescript.getTextOfNode(<typescript.Identifier>declaration.name));
      typescript.setReflectedType(node, contextualType);
      return op.unreachable();
    }
  }

  // Compile function if not yet compiled
  if (!instance.compiled) {
    compiler.compileFunction(instance); // throws if unexpected things happen (i.e. has no body)
    instance.compiled = true;
  }

  let argumentCount = instance.parameters.length;
  const argumentExpressions: binaryen.Expression[] = new Array(argumentCount);

  typescript.setReflectedType(node, instance.returnType);

  let i = 0;

  if (instance.isInstance) {
    argumentExpressions[i++] = op.getLocal(0, binaryen.typeOf(instance.parameters[0].type, compiler.uintptrSize));
    argumentCount -= 1;
  }

  for (let j = 0; j < argumentCount; ++j) {
    const argumentNode = node.arguments[j];
    argumentExpressions[i] = compiler.maybeConvertValue(argumentNode, compiler.compileExpression(argumentNode, instance.parameters[i].type), typescript.getReflectedType(argumentNode), instance.parameters[i].type, false);
    ++i;
  }

  if (i !== argumentExpressions.length) { // TODO: pull default value initializers from declaration
    compiler.error(node, "Invalid number of arguments", "Expected " + declaration.parameters.length + " but saw " + node.arguments.length);
    return op.unreachable();
  }

  let typeArguments: reflection.Type[] = [];

  if (declaration.typeParameters) {
    if (!node.typeArguments || node.typeArguments.length !== declaration.typeParameters.length) {
      compiler.error(node, "Invalid number of type arguments");
      return op.unreachable();
    }
    i = 0;
    typeArguments = new Array(node.typeArguments.length);
    for (const k = declaration.typeParameters.length; i < k; ++i) {
      const argument = node.typeArguments[i];
      const argumentName = typescript.getTextOfNode(argument);
      const resolvedType = compiler.currentFunction && compiler.currentFunction.typeArguments[argumentName] && compiler.currentFunction.typeArguments[argumentName].type || compiler.resolveType(argument);
      if (!resolvedType) {
        compiler.error(node.typeArguments[i], "Unresolvable type");
        return op.unreachable();
      }
      // TODO: check if type is valid
      typeArguments[i] = resolvedType;
    }
  }

  // user function
  if (!typescript.isDeclare(declaration))
    return op.call(instance.name, argumentExpressions, binaryen.typeOf(instance.returnType, compiler.uintptrSize));

  // builtin
  switch ((<typescript.Symbol>declaration.symbol).name) {

    case "rotl":
    case "rotll":
      return builtins.rotl(compiler, [ node.arguments[0], node.arguments[1] ], [ argumentExpressions[0], argumentExpressions[1] ]);

    case "rotr":
    case "rotrl":
      return builtins.rotr(compiler, [ node.arguments[0], node.arguments[1] ], [ argumentExpressions[0], argumentExpressions[1] ]);

    case "clz":
    case "clzl":
      return builtins.clz(compiler, node.arguments[0], argumentExpressions[0]);

    case "ctz":
    case "ctzl":
      return builtins.ctz(compiler, node.arguments[0], argumentExpressions[0]);

    case "popcnt":
    case "popcntl":
      return builtins.popcnt(compiler, node.arguments[0], argumentExpressions[0]);

    case "abs":
    case "absf":
      return builtins.abs(compiler, node.arguments[0], argumentExpressions[0]);

    case "ceil":
    case "ceilf":
      return builtins.ceil(compiler, node.arguments[0], argumentExpressions[0]);

    case "floor":
    case "floorf":
      return builtins.floor(compiler, node.arguments[0], argumentExpressions[0]);

    case "sqrt":
    case "sqrtf":
      return builtins.sqrt(compiler, node.arguments[0], argumentExpressions[0]);

    case "trunc":
    case "truncf":
      return builtins.trunc(compiler, node.arguments[0], argumentExpressions[0]);

    case "nearest":
    case "nearestf":
      return builtins.nearest(compiler, node.arguments[0], argumentExpressions[0]);

    case "min":
    case "minf":
      return builtins.min(compiler, [ node.arguments[0], node.arguments[1] ], [ argumentExpressions[0], argumentExpressions[1] ]);

    case "max":
    case "maxf":
      return builtins.max(compiler, [ node.arguments[0], node.arguments[1] ], [ argumentExpressions[0], argumentExpressions[1] ]);

    case "copysign":
    case "copysignf":
      return builtins.copysign(compiler, [ node.arguments[0], node.arguments[1] ], [ argumentExpressions[0], argumentExpressions[1] ]);

    case "reinterpreti":
    case "reinterpretl":
    case "reinterpretf":
    case "reinterpretd":
      return builtins.reinterpret(compiler, node.arguments[0], argumentExpressions[0]);

    case "current_memory":
      return builtins.current_memory(compiler);

    case "grow_memory":
      return builtins.grow_memory(compiler, node.arguments[0], argumentExpressions[0]);

    case "sizeof":
      return builtins.sizeof(compiler, typeArguments[0]);
  }

  // import
  return op.call(instance.name, argumentExpressions, binaryen.typeOf(instance.returnType, compiler.uintptrSize));
}
