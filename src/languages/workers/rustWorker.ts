import { createBrowserAssetLoader } from '../toolchains/browserAssetLoader';
import { MiriToolchain } from '../toolchains/rust/mirToolchain';
import { serveToolchain } from './serveToolchain';

const toolchain = new MiriToolchain(createBrowserAssetLoader());
serveToolchain((code, output) => toolchain.run(code, output));
