type InputArray<Inputs> = { [Index in keyof Inputs]: Node<any, Inputs[Index]> };
interface NodeParams<Inputs, Output> {
  inputs: InputArray<Inputs>;
  init(): Promise<void>;
  update(inputs: Inputs): Promise<Output>;
  useCache: boolean;
}

export class Node<Inputs extends Array<any>, Output> {
  private inputs: InputArray<Inputs>;
  private update: (inputs: Inputs) => Promise<Output>;
  private previousInputs: Inputs = null;
  private previousResult: Output = null;
  public useCache: boolean = true;
  public onchange?: (v: Output) => Promise<void>;
  private initPromise: Promise<void>;
  constructor({
    inputs = [] as any,
    update,
    init = async () => {},
    useCache = true,
  }: Partial<NodeParams<Inputs, Output>> = {}) {
    this.inputs = inputs;
    this.update = update;
    this.useCache = useCache;
    this.initPromise = Promise.resolve(init());
  }

  private isPreviousInputs(inputs: Inputs): boolean {
    if (inputs.length === 0) {
      return false;
    }
    if (inputs.length !== this.previousInputs?.length) {
      return false;
    }
    return inputs.every((v, idx) => this.previousInputs[idx] === v);
  }

  static map<Inputs extends Array<any>, Output>(
    inputs: InputArray<Inputs>,
    update: (v: Inputs) => Promise<Output>
  ): Node<Inputs, Output> {
    return new Node({ inputs, update });
  }

  map<NewOut>(f: (v: Output) => Promise<NewOut>): Node<[Output], NewOut> {
    return Node.map<[Output], NewOut>([this], async ([output]) => f(output));
  }

  async pull(): Promise<Output> {
    await this.initPromise;

    const inputs = (await Promise.all(
      this.inputs.map((v) => v.pull())
    )) as Inputs;
    if (this.useCache && this.isPreviousInputs(inputs)) {
      return this.previousResult;
    }
    this.previousResult = await this.update(inputs);
    this.previousInputs = inputs;
    await this.onchange?.(this.previousResult);
    return this.previousResult;
  }
}

export function singleValueNode<T>(v: T): Node<[], T> {
  return new Node<[], T>({
    inputs: [],
    async update() {
      return v;
    },
  });
}
