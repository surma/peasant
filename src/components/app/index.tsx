import { h, Fragment } from "preact";
import { useState } from "preact/hooks";
import LazyComponent from "../lazy-component/index.jsx";

export default function App() {
  const [file, setFile] = useState<File | null>(null);

  async function onFileChange(ev: InputEvent) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      setFile(file);
    }
  }

  if (!file) {
    return <input type="file" onChange={onFileChange} />;
  }
  return (
    <LazyComponent
      promise={import("../editor/index.jsx")}
      loading={() => <pre>Loading...</pre>}
      loaded={({ default: Editor }) => <Editor blob={file} />}
    />
  );
}
