import terser from "@rollup/plugin-terser";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "modules/index.ts",
  output: [
      {
        file: "dist/bundle.cjs.js",
        format: "cjs",
        exports: "auto",
      },
    {
      file: "dist/bundle.esm.js",
      format: "esm",
    },
  ],
  plugins: [nodeResolve(), commonjs(), typescript(), terser()],
};