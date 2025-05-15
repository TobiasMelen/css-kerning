
declare module "brotli-dec-wasm?init"{
  const module: typeof import("brotli-dec-wasm")
  export = module;
}

declare module "*/opentype.module.modified"{
  const opentype: typeof import("opentype.js");
  export = opentype;
}