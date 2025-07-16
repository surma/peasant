{
  autoconf,
  automake,
  libtool,
  pkg-config,
  emscripten,
  stdenv,
}:
let
  tarball = builtins.fetchurl {
    url = "https://www.libraw.org/data/LibRaw-0.21.4.tar.gz";
    sha256 = "sha256:0qwyl03285waafhyab012k52ajgzydmhbavaym7j2hvy74ckzr3b";
  };

  emscriptenDeps = [
    autoconf
    automake
    libtool
    pkg-config
    emscripten
  ];
in

stdenv.mkDerivation {
  name = "libraw";

  nativeBuildInputs = emscriptenDeps;

  unpackPhase = ''
    			runHook preUnpack

    			tar --strip-components 1 -xzf ${tarball}

    			runHook postUnpack
    		'';

  configurePhase = ''
    			runHook preConfigure

    			mkdir -p $NIX_BUILD_TOP/.emscripten_cache
    			export EM_CACHE=$NIX_BUILD_TOP/.emscripten_cache

    			autoreconf -iv 

    			emconfigure ./configure \
    				--disable-openmp \
    				--disable-lcms \
    				--disable-examples \
    				--disable-shared \
    				--enable-static \
    				--prefix=$out

    			runHook postConfigure
    		'';

  buildPhase = ''
    			runHook preBuild

    			export EM_CACHE=$NIX_BUILD_TOP/.emscripten_cache

    			emmake make

    			runHook postBuild
    		'';
  dontFixup = true;
}
