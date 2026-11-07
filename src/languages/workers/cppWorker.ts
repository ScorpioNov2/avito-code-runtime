import { createBrowserAssetLoader } from '../toolchains/browserAssetLoader';
import { ClangToolchain } from '../toolchains/clang/clangToolchain';
import { serveToolchain } from './serveToolchain';

const toolchain = new ClangToolchain(createBrowserAssetLoader());
serveToolchain((code, output) => toolchain.compileAndRun(code, output));
