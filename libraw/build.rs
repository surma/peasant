#![allow(unreachable_code)]
use std::{
    env,
    path::PathBuf,
    process::{Command, Stdio},
};

use bindgen;

fn main() {
    let nproc = Command::new("nproc")
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .unwrap_or(String::from("1"));
    let nproc_param = format!("-j{}", nproc.trim());
    Command::new("make")
        .args(&[nproc_param.as_str(), "libraw"])
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .output()
        .expect("Failed to build libraw");

    println!("cargo:rustc-link-lib=static=raw");
    println!("cargo:rustc-link-lib=c++");
    println!("cargo:rustc-link-lib=z");

    let mut lib_dir = PathBuf::from(env::current_dir().unwrap());
    lib_dir.push(".tmp/libraw/.build/lib/.libs");
    println!("cargo:rustc-link-search={}", lib_dir.to_string_lossy());

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
