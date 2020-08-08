use std::process::Command;

fn main() {
    Command::new("make")
        .args(&["libraw"])
        .output()
        .expect("Failed to build libraw");
}
