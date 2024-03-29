FROM emscripten/emsdk:3.1.1
RUN apt-get update && apt-get install -qqy autoconf libtool pkg-config
ENV CFLAGS "-O3 -flto"
ENV CXXFLAGS "${CFLAGS} -std=c++17"
ENV LDFLAGS "${CFLAGS} \
-s FILESYSTEM=0 \
-s PTHREAD_POOL_SIZE=navigator.hardwareConcurrency \
-s ALLOW_MEMORY_GROWTH -s MAXIMUM_MEMORY=4GB \
-s TEXTDECODER=2 \
-s NODEJS_CATCH_EXIT=0 -s NODEJS_CATCH_REJECTION=0 \
"
# Build and cache standard libraries with these flags + Embind.
RUN emcc ${CXXFLAGS} ${LDFLAGS} --bind -xc++ /dev/null -o /dev/null
# And another set for the pthread variant.
RUN emcc ${CXXFLAGS} ${LDFLAGS} --bind -pthread -xc++ /dev/null -o /dev/null
WORKDIR /src
CMD ["sh", "-c", "emmake make -j`nproc`"]
