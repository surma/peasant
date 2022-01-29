import { h, Fragment } from "preact";
import { useState } from "preact/hooks";
import LazyComponent from "../lazy-component/index.jsx";

export default function App() {
  const [file, setFile] = useState<ArrayBuffer | null>(null);

  async function onFileChange(ev: InputEvent) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const buffer = await new Response(file).arrayBuffer();
      setFile(buffer);
    }
  }

  if (!file) {
    return <input type="file" onChange={onFileChange} />;
  }
  return (
    <LazyComponent
      promise={import("../editor/index.jsx")}
      loading={() => <pre>Loading...</pre>}
      loaded={({ default: Editor }) => <Editor buffer={file} />}
    />
  );
}
