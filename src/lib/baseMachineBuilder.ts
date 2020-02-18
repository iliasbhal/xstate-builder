export class BaseMachineBuilder {
  public parent: any;
  public getConfig: () => any;
  public setConfig: (newValue: any) => void ;
  public onChange: any;
  public methods: any;

  constructor(attachConfig?: { parent: BaseMachineBuilder, getConfig, setConfig }) {
    this.reconstruct(attachConfig);
  }

  public reconstruct(attachConfig?: { parent, getConfig, setConfig }){
    if (attachConfig) {
      this.parent = attachConfig.parent;
      this.getConfig = attachConfig.getConfig;
      this.setConfig = attachConfig.setConfig;
    }
  }

  public assignConfig(configObj) {
    if (this.setConfig && this.getConfig) {
      this.setConfig({...this.getConfig(), ...configObj});
    }
  }

  public assignKeyConfig(key, configObj) {
    if (this.setConfig && this.getConfig) {
      const currentConfig = this.getConfig();
      const assignedKeydConfig = {...currentConfig[key], ...configObj}
      currentConfig[key] = assignedKeydConfig;

      this.assignConfig(currentConfig)
    }
  }

  public getChainMethods<ParentBuilder>() : this & ParentBuilder {
    return new Proxy(this, {
      get(target, prop, receiver) {
        let previousPortotype = target;
        let nextPrototype = target.parent;
        let nextMethod = previousPortotype[prop];

        while (!nextMethod && !!nextPrototype) {
          nextMethod = nextPrototype[prop];
          previousPortotype = nextPrototype;
          nextPrototype = nextPrototype.parent;
        }
        
        return (...agrs) => nextMethod.call(previousPortotype, ...agrs);
      },
    }) as any;
  }

  public handleCall(args: any, transformFunction?) {
    args.forEach(arg => {
      const isObject = typeof arg === 'object';
      if (isObject) {
        const assignedConfig = transformFunction
          ? transformFunction({ ...arg })
          : { ...arg };

        this.assignConfig(assignedConfig);
      }


      const isFunction = typeof arg === 'function';
      if (isFunction) {
        arg.call(this, this);
      }
    })

    return this.getChainMethods();
  }
}