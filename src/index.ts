// tslint:disable
import * as xState from 'xstate';
const { Machine: XMachine, actions } = xState;

class BaseMachineConfigBuilder {
  public parent: any;
  public getConfig: any;
  public setConfig: any;
  public onChange: any;
  public methods: any;

  constructor(attachConfig?: { parent, getConfig, setConfig }) {
    this.reconstruct(attachConfig);
  }

  reconstruct(attachConfig?: { parent, getConfig, setConfig }){
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

  public assignKeyConfig(key, configObj) {
    if (this.setConfig && this.getConfig) {
      const currentConfig = this.getConfig();
      const assignedKeydConfig = Object.assign({} , currentConfig[key], configObj)
      currentConfig[key] = assignedKeydConfig;

      this.assignConfig(currentConfig)
    }
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

  public handleCall(args, transformFunction?) {
    const assignObjectConfig = (argAssignObj) => {
      const isObject = typeof argAssignObj === 'object';
      if (isObject) {
        const assignedConfig = transformFunction
          ? transformFunction({ ...argAssignObj })
          : { ...argAssignObj };

        this.assignConfig(assignedConfig);
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
  public cond(condName: string) {
    const targetObject = {
      cond: condName,
    };

    const currentTransitionConfig = this.getConfig();
    const nextTransitionConfig = this.updateTransition('cond', currentTransitionConfig, targetObject);
    this.setConfig(nextTransitionConfig);

    return this.getChainMethods();
  }

  public in(condName: string) {
    const targetObject = {
      in: condName,
    };

    const currentTransitionConfig = this.getConfig();
    const nextTransitionConfig = this.updateTransition('in', currentTransitionConfig, targetObject);
    this.setConfig(nextTransitionConfig);

    return this.getChainMethods();
  }

  public actions(actionConfig: any) {
    const isFunction = typeof actionConfig === 'function';
    const targetObject = {
      actions: isFunction ? actionConfig(actions) : actionConfig,
    };

    const currentTransitionConfig = this.getConfig();
    const nextTransitionConfig = this.updateTransition('actions', currentTransitionConfig, targetObject);
    this.setConfig(nextTransitionConfig);

    return this.getChainMethods();
  }

  public target(target: any, type: { internal?: boolean, external?: boolean } = {}) {
    const isStateNode = target instanceof StateBuilder;
    const targetObject = {
      target: isStateNode ? target._id : target,
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
  public do = this.actions;
  public redirect = this.target;
  public default = this.target;

  // shorthand methods
  public action = (actionConfig) => this.actions(actionConfig);
  public stop = () => this.actions([]); // forbidden transition;
  public doNothing = () => this.actions([]); // forbidden transition;
  public stopPopagation = () => this.actions([]);
  public send = (actionName: string, options: any) => this.actions(actions.send(actionName, options));
  public respond = (actionName: string, options: any) => this.actions(actions.respond(actionName, options));
  public raise = (actionName: string) => this.actions(actions.raise(actionName));
  public forwardTo = (actionName: string) => this.actions(actions.send(actionName, { to: actionName }));
  public forward = (actionName: string) => this.actions(actions.send(actionName, { to: actionName }));
  public escalate = (actionName: string) => this.actions(actions.escalate(actionName));
  public assign = (assignConfig: any) => this.actions(actions.assign(assignConfig));
  public error = (actionName: string) => this.actions(actions.escalate(actionName));
  public log = (expr?: any, label?: any) => this.actions(actions.log(expr, label));

  private updateTransition(key:string, currentTranstionConfig, targetObject) {
    let transitionConfig = currentTranstionConfig;

    const isUndefined = typeof currentTranstionConfig === 'undefined';
    const isEmptyObject = !isUndefined && JSON.stringify(currentTranstionConfig) === '{}';
    if (isUndefined || isEmptyObject) {
      if (key === 'target') {
        return targetObject.target;
      }

      return {
        ...currentTranstionConfig,
        ...targetObject,
      };
    }

    const isString = typeof currentTranstionConfig === 'string';
    if (isString) {
      transitionConfig = {
        target: currentTranstionConfig,
      };
    }


    const isObject = typeof transitionConfig === 'object';
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

  private createScopedTransitionBuilder(scopeName: string) {
    const transitionBuilder = (eventName: string) => new TransitionBuilder({
      parent: this,
      getConfig: () => this.getConfig()[eventName],
      setConfig: value => {
        this.assignConfig({ [eventName]: value })
      },
    });

    return (transitionConfig) => {
      const builder = transitionBuilder(scopeName);
      transitionConfig(builder);
      return this;
    };
  }
}

class HistoryBuilder extends BaseMachineConfigBuilder {
  public _id: string;

  constructor(id, ...args) {
    super(...args);
    this._id = id;
  }

  id = (id: string) => {
    this._id = id;
    this.assignConfig({ 'id': id });
  }

  deep() {
    this.setConfig({ history: 'deep' })
    return this;
  }

  shallow() {
    this.setConfig({ history: 'shallow' })
    return this;
  }

  target(targetName) {
    const isStateBuilder = targetName instanceof StateBuilder;
    this.setConfig({ target: isStateBuilder ? targetName._id : targetName })
    return this;
  }
}

class StateBuilder extends BaseMachineConfigBuilder {
  public _id: string;

  constructor(id, ...args) {
    super(...args);
    this._id = id;
  }

  getMachine() {
    return XMachine(this.getConfig);
  }

  id = (id: string) => {
    this._id = id;
    this.onStateProperty('id', id);
  }

  public describe = (describeFn: any) => {
    const isState = describeFn instanceof StateBuilder;
    const isArray = Array.isArray(describeFn);
    
    if (isState) {
      this.addChildState(describeFn);
      return this;
    } 
    
    if (isArray) {
      describeFn.forEach((stateNode) => {
        this.addChildState(stateNode);
      })
      return this;
    }


    const currentConfig = this.getConfig();
    const isParallel = currentConfig.type === 'parallel';
    this.assignConfig({
      type: !isParallel ? 'compound' : undefined,
    });

    let childStateConfig = {};
    const childStateBuilder = new StateBuilder(null, {
      parent: this,
      getConfig: () => childStateConfig,
      setConfig: (value) => { childStateConfig = value; },
    });

    describeFn(childStateBuilder);

    this.assignKeyConfig('states', childStateConfig['states']);
  }

  public context = (contextObj: any) => this.onStateProperty('context', contextObj);
  public activites = (activites: any) => this.onStateProperty('activites', activites);
  public strict = (strictMode: boolean = true) => this.onStateProperty('strict', strictMode);
  public key = (keyName: string) => this.onStateProperty('key', keyName);
  public onEntry = (entryActions: any) => this.onStateProperty('entry', entryActions);
  public onExit = (entryActions: any) => this.onStateProperty('exit', entryActions);
  public onDone = (entryActions: any) => this.onStateProperty('onDone', entryActions);
  public onError = (entryActions: any) => this.onStateProperty('onError', entryActions);
  public onStateProperty(statePropertyName, statePropertyData, chainMethods?) {
    const isFunction = typeof statePropertyData === 'function';
    const value = isFunction ? statePropertyData(actions) : statePropertyData;

    const isState = value instanceof StateBuilder;
    this.assignConfig({ 
      [statePropertyName] : isState ? value._id : value 
    });

    return chainMethods || this.getChainMethods();
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

    transitionBuilder.handleCall(args);
    return transitionBuilder;
  }

  public node = (stateName: string, ...args) : StateBuilder => {
    const currentConfig = this.getConfig();

    if (!currentConfig.initial && currentConfig['type'] !== 'parallel') {
      currentConfig.initial = stateName;
    }

    if (!currentConfig.states) {
      currentConfig.states = {};
    }

    const stateBuilder = new StateBuilder(stateName, {
      parent: this.getChainMethods(),
      getConfig: () => currentConfig.states[stateName],
      setConfig: newState => {
        if (!newState) {
          delete currentConfig.states[stateName];
        } else {
          currentConfig.states[stateName] = newState;
        }
      }
    });

    stateBuilder.handleCall(args);
    this.setConfig(currentConfig);

    return stateBuilder;
  }

  public history = (stateName, ...args) => {
    const hisotryConfig = {
      [stateName]: {
        type: 'history',
      }
    };

    const historyBuilder = new HistoryBuilder(stateName, {
      getConfig: () => hisotryConfig[stateName],
      setConfig: value => {
        hisotryConfig[stateName] = Object.assign({}, hisotryConfig[stateName], value);
        this.assignKeyConfig('states', hisotryConfig);
      },
    });

    historyBuilder.handleCall(args, (obj) => {
      Object.keys(obj).forEach(objKey => {
        if (objKey === 'deep') {
          obj['history'] = 'deep';
          delete obj['deep'];
        } else if (objKey === 'shallow') {
          obj['history'] = 'shallow';
          delete obj['shallow'];
        }
      });

      return obj;
    });
    this.assignKeyConfig('states', hisotryConfig);

    return historyBuilder;
  }

  public invoke = (...args) : InvokeBuilder => {
    const currentConfig = this.getConfig();

    const invokeBuilder = new InvokeBuilder({
      parent: this,
      getConfig: () => currentConfig.invoke,
      setConfig: newData => currentConfig.invoke = newData,
    });

    invokeBuilder.handleCall(args);
    return invokeBuilder;
  }

  public addChildState(stateNode: StateBuilder) {
    const thisConfig = this.getConfig();
    const childConfig = stateNode.getConfig();
    stateNode.setConfig(undefined)

    const shouldBeCompound = thisConfig['type'] !== 'parallel'
    const newAssignConfig = { 
      states: { 
        [stateNode._id]: childConfig 
      }
    };

    stateNode.reconstruct({
      parent: this,
      getConfig: () => newAssignConfig.states[stateNode._id],
      setConfig: (newState) => {
        if (!newState) {
          delete newAssignConfig.states[stateNode._id];
        } else {
          newAssignConfig.states[stateNode._id] = newState;
        }
      }
    })

    this.assignConfig({ 'type': shouldBeCompound ? 'compound' : thisConfig['type'] });
    this.assignKeyConfig('states', newAssignConfig.states);
  }


  public data = this.context;
  public withContext = this.context;
  public children = this.describe;

  public when = this.on;
  public event = this.on;

  public use = this.invoke;
  public require = this.invoke;
  public import = this.invoke;

  public atomic = (stateName: string, ...args) => this.updateOrCreateState(stateName, 'atomic', ...args);
  public compound = (stateName: string, ...args) => this.updateOrCreateState(stateName, 'compound', ...args);
  public parallel = (stateName: string, ...args) => this.updateOrCreateState(stateName,'parallel', ...args);
  public final = (stateName: string, ...args) => this.updateOrCreateState(stateName,'final', ...args);
  public transient = (stateName: string, ...args) => this.updateOrCreateState(stateName,'atomic', ...args).on('', '');
  public switch = (stateName: string, ...args) => this.updateOrCreateState(stateName,'atomic', ...args).on('', '');
  public choice = (stateName: string, ...args) => this.updateOrCreateState(stateName,'atomic', ...args).on('', '');
  public state = this.atomic;

  public states = (children: any[], ...args) => {
    return children.map((child) => {
      if(typeof child === 'string') {
        return this.atomic(child, ...args);
      } else if (child instanceof StateBuilder) {
        this.addChildState(child);
        return child;
      }
    })
  }

  updateOrCreateState(stateName: any, type: string, ...args) {
    const isChildrenFn = typeof stateName === 'function' && ['parallel', 'compound'].includes(type);
    if (isChildrenFn) {
      this.onStateProperty('type', type)
      return stateName(this);
    }

    if (type === 'final' && stateName === undefined) {
      return this.onStateProperty('type', 'final');
    }

    return this.node(stateName, { type: type }, ...args)
  }
}

class MachineBuilder extends StateBuilder {
  createTransition() {

  }


}

export default class Machine {
  public static Builder(builderFn) {
    let data = {}
    const stateBuilder = new StateBuilder('machine', {
      getConfig: () => data,
      setConfig: newValue => data = newValue,
    });

    builderFn(stateBuilder);

    return stateBuilder;
  }
}

