{
  pkgs ? import (builtins.fetchTarball {
    url = "https://github.com/NixOS/nixpkgs/archive/dab3a6e781554f965bde3def0aa2fda4eb8f1708.tar.gz";
    sha256 = "sha256:0sabyminhpllps3k0hhxf54jhic51ilvhk2xmfvvl776xyr5alwl";
  }) { },
}:
let
  inherit (pkgs) callPackage stdenv emscripten;

  libraw = callPackage (import ./libraw.nix) { };

in
stdenv.mkDerivation rec {
  name = "decoder";
  nativeBuildInputs = [ emscripten ];
  src = ./raw.cpp;
  dontUnpack = true;
  buildPhase = ''
    		mkdir -p $NIX_BUILD_TOP/.emscripten_cache
    		export EM_CACHE=$NIX_BUILD_TOP/.emscripten_cache

    		mkdir $out

    		em++ \
    			-s FILESYSTEM=0 \
    			-s PTHREAD_POOL_SIZE=navigator.hardwareConcurrency \
    			-s ALLOW_MEMORY_GROWTH -s MAXIMUM_MEMORY=4GB \
    			-s TEXTDECODER=2 \
    			-s EXPORT_ES6=1 \
    			-s ENVIRONMENT=worker \
    			-O2 \
    			-flto \
    			-lembind \
    			--std=c++20 \
    			-I ${libraw}/include \
    			${src} \
    			${libraw}/lib/libraw.a \
    			--emit-tsd $out/decoder.d.ts \
    			-o $out/decoder.js
    	'';
}
