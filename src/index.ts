import { actions } from 'xstate';

// tslint:disable
export default class Machine {
  public static Builder(builderFn) {
    let data = {};
    const state = new StateBuilder('machine', {
      getConfig: () => data,
      setConfig: newValue => data = newValue,
    });

    builderFn(state);

    return data;
  }
}

class BaseMachineConfigBuilder {
  public parent: any;
  public getConfig: any;
  public setConfig: any;
  public onChange: any;

  constructor(attachConfig?: { parent, getConfig, setConfig }) {
    if (attachConfig) {
      this.parent = attachConfig.parent;
      this.getConfig = attachConfig.getConfig;
      this.setConfig = attachConfig.setConfig;
    }
  }

  public assignConfig(configObj) {
    if (this.setConfig && this.getConfig) {
      this.setConfig(Object.assign({}, this.getConfig(), configObj));
    }
  }

  public withConfig(configObject) {
    const currentConfig = this.getConfig();
    const newConfig = Object.assign({}, currentConfig, configObject);
    this.setConfig(newConfig);
  }

  public getChainMethods() {
    return new Proxy(this, {
      get(target, prop, receiver) {
        let nextPrototype = target.parent;
        let nextMethod = target[prop];

        while (!nextMethod && !!nextPrototype) {
          nextMethod = nextPrototype[prop];
          nextPrototype = nextPrototype.extend;
        }

        return nextMethod;
      },
    });
  }

  public handleCall(...args) {
    const assignObjectConfig = (argAssignObj) => {
      const isObject = typeof argAssignObj === 'object';
      if (isObject) {
        this.withConfig({ ...argAssignObj });
      }
    };

    const executeDescribe = (argFunction) => {
      const isFunction = typeof argFunction === 'function';
      if (isFunction) {
        argFunction.call(this, this);
      }
    };

    for (const arg of args) {
      assignObjectConfig(arg);
      executeDescribe(arg);
    }

    return this.getChainMethods();
  }
}

class TransitionBuilder extends BaseMachineConfigBuilder {
  public cond = (condName: string) => {
    const targetObject = {
      cond: condName,
    };

    const currentTransitionConfig = this.getConfig();
    const nextTransitionConfig = this.updateTransition('cond', currentTransitionConfig, targetObject);
    this.setConfig(nextTransitionConfig);

    return this.getChainMethods();
  }

  public in = (condName: string) => {
    const targetObject = {
      in: condName,
    };

    const currentTransitionConfig = this.getConfig();
    const nextTransitionConfig = this.updateTransition('in', currentTransitionConfig, targetObject);
    this.setConfig(nextTransitionConfig);

    return this.getChainMethods();
  }

  public action(actionConfig: any) {
    const isFunction = typeof actionConfig === 'function';
    const targetObject = {
      action: isFunction ? actionConfig(actions) : actionConfig,
    };

    const currentTransitionConfig = this.getConfig();
    const nextTransitionConfig = this.updateTransition('action', currentTransitionConfig, targetObject);
    this.setConfig(nextTransitionConfig);

    return this.getChainMethods();
  }
  public target(target: any, type: { internal?: boolean, external?: boolean } = {}) {
    const isStateNode = target instanceof StateBuilder;
    const targetObject = {
      target: isStateNode ? target.id : target,
      ...type,
    };

    const currentTransitionConfig = this.getConfig();
    const nextTransitionConfig = this.updateTransition('target', currentTransitionConfig, targetObject);
    this.setConfig(nextTransitionConfig);

    return this.getChainMethods();
  }

  // aliases
  public if = this.cond;
  public elseif = this.cond;
  public case = this.cond;
  public guard = this.cond;
  public do = this.action;
  public redirect = this.target;
  public default = this.target;

  // shorthand methods
  public stop = () => this.action([]); // forbidden transition;
  public doNothing = () => this.action([]); // forbidden transition;
  public stopPopagation = () => this.action([]);
  public send = (actionName: string, options: any) => this.action(actions.send(actionName, options));
  public respond = (actionName: string, options: any) => this.action(actions.respond(actionName, options));
  public raise = (actionName: string) => this.action(actions.raise(actionName));
  public forwardTo = (actionName: string) => this.action(actions.send(actionName, { to: actionName }));
  public forward = (actionName: string) => this.action(actions.send(actionName, { to: actionName }));
  public escalate = (actionName: string) => this.action(actions.escalate(actionName));
  public assign = (assignConfig: any) => this.action(actions.assign(assignConfig));
  public error = (actionName: string) => this.action(actions.escalate(actionName));
  public log = (expr?: any, label?: any) => this.action(actions.log(expr, label));

  public updateTransition(key:string, currentTranstionConfig, targetObject) {
    let transitionConfig = currentTranstionConfig;

    const isUndefined = typeof currentTranstionConfig === 'undefined';
    const isEmptyObject = !isUndefined && JSON.stringify(currentTranstionConfig) === '{}';
    if (isUndefined || isEmptyObject) {
      if (key === 'target') {
        return targetObject.target;
      }

      return {
        ...targetObject,
      };
    }

    const isString = typeof currentTranstionConfig === 'string';
    if (isString) {
      transitionConfig = {
        target: currentTranstionConfig,
      };
    }

    const isObject = typeof currentTranstionConfig === 'object';
    if (isObject) {
      const isArray = Array.isArray(transitionConfig);
      if (!isArray) {
        const isAlreadyDefined = !!transitionConfig[key];
        if (!isAlreadyDefined) {
          return Object.assign({}, transitionConfig, targetObject);
        }

        transitionConfig = [transitionConfig];
      }

      const lastBeforeEnd = Array.from(transitionConfig)
        .reverse().findIndex(on => !on[key]);
      if (lastBeforeEnd !== -1) {
        const index = transitionConfig.length - 1 - lastBeforeEnd;
        transitionConfig[index] = Object.assign({}, transitionConfig[index], targetObject);
        return transitionConfig;
      }

      transitionConfig.push(targetObject);
      return transitionConfig;
    }
  }
}

class InvokeBuilder extends BaseMachineConfigBuilder {
  public onDone = this.createScopedTransitionBuilder('onDone');
  public onComplete = this.onDone;
  public onFinal = this.onDone;
  public finally = this.onDone;
  public then = this.onDone;

  public onError = this.createScopedTransitionBuilder('onError');
  public onException = this.onDone;
  public catch = this.onDone;

  public createScopedTransitionBuilder(scopeName: string) {
    const transitionBuilder = (eventName: string) => new TransitionBuilder({
      parent: this,
      getConfig: () => this.getConfig()[eventName],
      setConfig: value => this.withConfig({ [eventName]: value }),
    });

    return (transitionConfig) => {
      const builder = transitionBuilder(scopeName);
      transitionConfig(builder);
      return this;
    };
  }
}

class StateBuilder extends BaseMachineConfigBuilder {
  public id: string;

  constructor(id, ...args) {
    super(...args);
    this.id = id;
  }

  public onConfigChange = () => {

  }
  // data = this.context;

  public describe = (describeFn: any) => {
    const currentConfig = this.getConfig();
    const isParallel = currentConfig.type === 'parallel';
    this.setConfig({
      type: !isParallel ? 'compound' : undefined,
    });

    let childStateConfig = {};
    const childStateBuilder = new StateBuilder(null, {
      parent: this,
      getConfig: () => childStateConfig,
      setConfig: (value) => { childStateConfig = value; },
    });

    describeFn(childStateBuilder);

    this.setConfig(Object.assign({},
      this.getConfig(),
      { states: childStateConfig['states'] }
    ));
  }

  public context = (contextObj: any) => this.onStateProperty('context', contextObj);
  public activites = (activites: any) => this.onStateProperty('activites', activites);
  public strict = (strictMode: boolean = true) => this.onStateProperty('strict', strictMode);
  public key = (keyName: string) => this.onStateProperty('key', keyName);
  public onEntry = (entryActions: any) => this.onStateProperty('entry', entryActions);
  public onExit = (entryActions: any) => this.onStateProperty('exit', entryActions);
  public onDone = (entryActions: any) => this.onStateProperty('onDone', entryActions);
  public onError = (entryActions: any) => this.onStateProperty('onError', entryActions);
  public onStateProperty(statePropertyName, statePropertyData) {
    const isFunction = typeof statePropertyData === 'function';
    const value = isFunction ? statePropertyData(actions) : statePropertyData;
    this.setConfig({ [statePropertyName] : value });

    return this;
  }

  public on = (eventName: string, ...args) : TransitionBuilder => {
    const currentConfig = this.getConfig() || {};

    const transitionBuilder = new TransitionBuilder({
      parent: this,
      getConfig: () => {
        if (!currentConfig.on) {
          currentConfig.on = {};
        }

        return currentConfig.on[eventName] || {};
      },
      setConfig: (newConfig) => {
        if (!currentConfig.on) {
          currentConfig.on = {};
        }

        currentConfig.on[eventName] = newConfig;
      },
    });

    const isTarget = typeof args[0] === 'string'
      || args[0] instanceof StateBuilder;
    if (isTarget) {
      const target = args.pop();
      transitionBuilder.target(target, ...args);
      args.pop();
    }

    transitionBuilder.handleCall(...args);
    return transitionBuilder;
  }

  public node = (stateName: string, ...args) : StateBuilder => {
    const currentConfig = this.getConfig();

    if (!currentConfig.initial) {
      currentConfig.initial = stateName;
    }

    if (!currentConfig.states) {
      currentConfig.states = {};
    }

    const stateBuilder = new StateBuilder(stateName, {
      parent: this.getChainMethods(),
      getConfig: () => currentConfig.states[stateName],
      setConfig: newState => currentConfig.states[stateName] = newState,
    });

    stateBuilder.handleCall(...args);
    this.setConfig(currentConfig);

    return stateBuilder;
  }

  public invoke = (...args) : InvokeBuilder => {
    const currentConfig = this.getConfig();

    const invokeBuilder = new InvokeBuilder({
      parent: this,
      getConfig: () => currentConfig.invoke,
      setConfig: newData => currentConfig.invoke = newData,
    });

    invokeBuilder.handleCall(...args);
    return invokeBuilder;
  }

  public children = this.describe;

  public when = this.on;
  public event = this.on;

  public use = this.invoke;
  public require = this.invoke;
  public import = this.invoke;

  public atomic = (stateName: string, ...args) => this.node(stateName, { type: 'atomic' }, ...args);
  public compound = (stateName: string, ...args) => this.node(stateName, { type: 'compound' }, ...args);
  public parallel = (stateName: string, ...args) => this.node(stateName, { type: 'parallel' }, ...args);
  public final = (stateName: string, ...args) => this.node(stateName, { type: 'final' }, ...args);
  public history = (stateName: string, ...args) => this.node(stateName, { type: 'history' }, ...args);
  public transient = (stateName: string, ...args) => this.node(stateName, { type: 'atomic' }, ...args).on('');
  public switch = (stateName: string, ...args) => this.node(stateName, { type: 'atomic' }, ...args).on('');
  public choice = (stateName: string, ...args) => this.node(stateName, { type: 'atomic' }, ...args).on('');
}
