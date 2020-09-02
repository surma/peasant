TMP_FOLDER = $(OUT_DIR)

LIBRAW_FOLDER = $(TMP_FOLDER)/libraw
LIBRAW_BUILD_FOLDER = $(LIBRAW_FOLDER)/build
LIBRAW_VERSION = 0.20.0
LIBRAW_URL = https://github.com/LibRaw/LibRaw
LIBRAW = $(LIBRAW_BUILD_FOLDER)/lib/.libs/libraw.a

OUTPUT = libraw.js

ifeq ($(CARGO_CFG_TARGET_ARCH),wasm32)
	CC = emcc
	CONFIGURE_PREFIX = emconfigure
	MAKE_PREFIX = emmake
else
	CONFIGURE_PREFIX =
	MAKE_PREFIX =
endif

.PHONY: all clean clean-all libraw

all: $(OUTPUT)

libraw: $(LIBRAW)

$(LIBRAW_FOLDER)/configure.ac:
	mkdir -p $(LIBRAW_FOLDER)
	curl -sL $(LIBRAW_URL)/archive/$(LIBRAW_VERSION).tar.gz | tar -xzf - --strip 1 -C $(LIBRAW_FOLDER)

$(LIBRAW_FOLDER)/configure: $(LIBRAW_FOLDER)/configure.ac
	cd $(LIBRAW_FOLDER) && \
	autoreconf -fiv

$(LIBRAW_BUILD_FOLDER)/Makefile: $(LIBRAW_FOLDER)/configure
	mkdir -p $(LIBRAW_BUILD_FOLDER)
	cd $(LIBRAW_BUILD_FOLDER) && \
	$(CONFIGURE_PREFIX) ../configure \
	  --disable-openmp \
	  --disable-lcms \
	  --disable-jpeg \
	  --disable-jasper \
	  --disable-zlib \
	  --disable-examples

$(LIBRAW): $(LIBRAW_BUILD_FOLDER)/Makefile
	cd $(LIBRAW_BUILD_FOLDER) && \
	$(MAKE_PREFIX) $(MAKE)

$(OUTPUT): $(LIBRAW)
	$(CC) \
		-O3 \
		$(CXXFLAGS) \
		--bind \
		-s MODULARIZE=1 \
		-s ALLOW_MEMORY_GROWTH=1 \
		-s EXPORT_ES6=1 \
		-s 'EXPORT_NAME="libraw"' \
		-I $(LIBRAW_FOLDER) \
		-o ./$(OUTPUT) \
		bindings.cpp \
		$(LIBRAW)

clean:
	$(RM) $(OUTPUT)

clean-all: clean
	cd $(LIBRAW_BUILD_FOLDER) && $(MAKE) clean
	$(RM) -r $(LIBRAW_BUILD_FOLDER)
