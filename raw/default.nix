{
	pkgs ? import (builtins.fetchTarball {
		url = "https://github.com/NixOS/nixpkgs/archive/dab3a6e781554f965bde3def0aa2fda4eb8f1708.tar.gz";
		sha256 = "sha256:0sabyminhpllps3k0hhxf54jhic51ilvhk2xmfvvl776xyr5alwl";
	}) {}
}:
let
	inherit (pkgs) callPackage stdenv emscripten;

	emcache =  stdenv.mkDerivation {
		name = "emcache";
		nativeBuildInputs = [emscripten];
		dontUnpack = true;
		buildPhase = ''
			mkdir -p $out
			export EM_CACHE=$out

			touch empty.c
			emcc --bind empty.c -o empty.js
		'';
		dontInstall = true;
		dontFixup = true;
	};

	libraw = callPackage (import ./libraw.nix) {inherit emcache;};

in
stdenv.mkDerivation rec {
	name = "decoder";
	nativeBuildInputs = [emscripten];
	src = ./raw.cpp;
	dontUnpack = true;
	buildPhase = ''
		mkdir -p $NIX_BUILD_TOP/.emscripten_cache
		cp -r ${emcache}/* $NIX_BUILD_TOP/.emscripten_cache
		export EM_CACHE=$NIX_BUILD_TOP/.emscripten_cache
		find $EM_CACHE | xargs -n1 chmod u+w

		mkdir $out

		em++ \
			-s FILESYSTEM=0 \
			-s PTHREAD_POOL_SIZE=navigator.hardwareConcurrency \
			-s ALLOW_MEMORY_GROWTH -s MAXIMUM_MEMORY=4GB \
			-s TEXTDECODER=2 \
			-s EXPORT_ES6=1 \
			-s ENVIRONMENT=worker \
			-g \
			-lembind \
			--std=c++20 \
			-I ${libraw}/include \
			${src} \
			${libraw}/lib/libraw.a \
			--emit-tsd $out/decoder.d.ts \
			-o $out/decoder.js
	'';
}
