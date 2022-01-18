#!/bin/bash

docker build -t cpp-wasm - < ../cpp.Dockerfile
docker run --rm -it -v $PWD:/src cpp-wasm