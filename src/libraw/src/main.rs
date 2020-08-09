mod bindings;
mod wrapper;

fn main() {
    println!(
        "Hello, world! v{}.{}.{}",
        wrapper::VERSION_MAJOR,
        wrapper::VERSION_MINOR,
        wrapper::VERSION_PATCH
    );
}
