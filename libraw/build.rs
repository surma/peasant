#![allow(unreachable_code)]
use std::{
    collections::HashSet,
    env,
    path::PathBuf,
    process::{Command, Stdio},
};

use bindgen;

#[derive(Debug)]
struct IgnoreMacros(HashSet<String>);

impl bindgen::callbacks::ParseCallbacks for IgnoreMacros {
    fn will_parse_macro(&self, name: &str) -> bindgen::callbacks::MacroParsingBehavior {
        if self.0.contains(name) {
            bindgen::callbacks::MacroParsingBehavior::Ignore
        } else {
            bindgen::callbacks::MacroParsingBehavior::Default
        }
    }
}

fn main() {
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());

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

    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap();
    // TODO: Check Windows and Wasm
    if target_os == "linux" {
        println!("cargo:rustc-link-lib=stdc++");
    } else {
        println!("cargo:rustc-link-lib=c++");
    }

    let mut lib_dir = out_dir.clone();
    lib_dir.push("libraw/build/lib/.libs");

    let ignored_macros = IgnoreMacros(
        vec![
            "FP_INFINITE".into(),
            "FP_NAN".into(),
            "FP_NORMAL".into(),
            "FP_SUBNORMAL".into(),
            "FP_ZERO".into(),
            "IPPORT_RESERVED".into(),
        ]
        .into_iter()
        .collect(),
    );

    let bindings = bindgen::Builder::default()
        .header(out_dir.join("libraw/libraw/libraw.h").to_string_lossy())
        .parse_callbacks(Box::new(ignored_macros))
        .generate()
        .expect("Could not generate bindings");

    bindings
        .write_to_file(out_dir.join("bindings.rs"))
        .expect("Couldn't write bindings!");

    println!("cargo:rustc-link-search={}", lib_dir.to_string_lossy());
}
