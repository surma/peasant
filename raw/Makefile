CODEC_URL := https://www.libraw.org/data/LibRaw-0.20.2.tar.gz
CODEC_DIR := node_modules/libraw
CODEC_OUT_RELATIVE := lib/.libs/libraw.a
CODEC_OUT := $(addprefix $(CODEC_DIR)/, $(CODEC_OUT_RELATIVE))
ENVIRONMENT = worker

CFLAGS := -O3 -flto
CXXFLAGS := $(CFLAGS) -std=c++20
LDFLAGS := $(CFLAGS) \
-s FILESYSTEM=0 \
-s PTHREAD_POOL_SIZE=navigator.hardwareConcurrency \
-s ALLOW_MEMORY_GROWTH=1 \
-s TEXTDECODER=2 

OUT_JS := build/raw.js
OUT_WASM := $(OUT_JS:.js=.wasm)

.PHONY: all clean

all: $(OUT_JS)

%.js: $(CODEC_OUT) raw.cpp
	$(CXX) \
		-I $(CODEC_DIR) \
		${CXXFLAGS} \
		${LDFLAGS} \
		--bind \
		-s ENVIRONMENT=$(ENVIRONMENT) \
		-s EXPORT_ES6=1 \
		-o $@ \
		$+

# This one is a bit special: there is no rule for .libs/libjpeg.a
#  so we use libjpeg.la which implicitly builds that one instead.
$(CODEC_OUT): $(CODEC_DIR)/Makefile
	cd $(CODEC_DIR) && $(MAKE)

$(CODEC_DIR)/Makefile: $(CODEC_DIR)/configure
	cd $(CODEC_DIR) && emconfigure ./configure \
		--disable-openmp  \
		--disable-lcms \
		--disable-examples

$(CODEC_DIR)/configure: $(CODEC_DIR)/configure.ac
	cd $(CODEC_DIR) && autoreconf -iv

$(CODEC_DIR)/configure.ac: $(CODEC_DIR)

$(CODEC_DIR):
	mkdir -p $@
	curl -sL $(CODEC_URL) | tar xz --strip 1 -C $@

clean:
	$(RM) $(OUT_JS) $(OUT_WASM)
	$(MAKE) -C $(CODEC_DIR) clean