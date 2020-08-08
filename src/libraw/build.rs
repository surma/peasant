use std::process::Command;
use std::string::String;

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
}
