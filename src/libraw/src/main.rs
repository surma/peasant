mod bindings;

use bindings::*;
fn main() {
    println!(
        "Hello, world! v{}.{}.{}",
        LIBRAW_MAJOR_VERSION, LIBRAW_MINOR_VERSION, LIBRAW_PATCH_VERSION
    );
}
