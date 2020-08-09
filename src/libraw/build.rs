use std::env;
use std::path::PathBuf;
use std::process::Command;
use std::string::String;

use bindgen;

fn main() {
    let nproc = Command::new("nproc")
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .unwrap_or(String::from("0"));
    Command::new("make")
        .args(&[format!("-j{}", nproc).as_str(), "libraw"])
        .output()
        .expect("Failed to build libraw");

    println!("cargo:rustc-link-lib=static=raw");
    println!("cargo:rustc-link-lib=c++");
    println!("cargo:rustc-link-lib=z");
    println!("cargo:rustc-link-search=.tmp/libraw/.build/lib/.libs");

    let bindings = bindgen::Builder::default()
        .header(".tmp/libraw/libraw/libraw.h")
        .parse_callbacks(Box::new(bindgen::CargoCallbacks))
        .generate()
        .expect("Could not generate bindings");

    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Couldn't write bindings!");
}
