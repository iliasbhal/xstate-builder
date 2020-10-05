import * as xState from 'xstate';
import { BaseMachineBuilder } from './baseMachineBuilder';
import { HistoryBuilder } from './historyBuilder';
import { InvokeBuilder } from './invokeBuilder';
import { TransitionBuilder } from './transitionBuilder';

export class StateBuilder<T extends string | string> extends BaseMachineBuilder {
  public _id: T;

  public data = this.context;
  public withContext = this.context;

  public children = this.describe;

  public when = this.on;
  public event = this.on;
  public forEachEvent = this.onEach

  public state = this.atomic;

  public use = this.invoke;
  public call = this.invoke;
  public require = this.invoke;
  public import = this.invoke;

  constructor(id: T, ...args) {
    super(...args);
    this._id = id;
  }

  public getMachine() {
    return xState.Machine(this.getConfig());
  }

  public id = (id: T) => {
    this._id = id;
    this.updateStateProperty('id', id);
  }

  public describe(describeFn: any) {
    const isState = describeFn instanceof StateBuilder;
    if (isState) {
      this.addChildState(describeFn);
      return this;
    } 
    
    const isArray = Array.isArray(describeFn);
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

    let childStateConfig: any = {
      states: {}, 
    };

    const childStateBuilder = new StateBuilder(null, {
      parent: this,
      getConfig: () => childStateConfig,
      setConfig: (value) => { childStateConfig = value; },
    });

    describeFn(childStateBuilder);

    this.assignKeyConfig('states', childStateConfig.states);

    const shouldUpdateInitialState = !isParallel && (!!childStateConfig.initial && !currentConfig.initial);
    if (shouldUpdateInitialState) {
      this.assignConfig({'initial': childStateConfig.initial});
    }

    return this;
  }

  public ctx(contextObj: any) { return this.updateStateProperty('context', contextObj); }
  public assign(contextObj: any) { return this.updateStateProperty('context', contextObj); }
  public context(contextObj: any) { return this.updateStateProperty('context', contextObj); }
  public activites(activites: any) { return this.updateStateProperty('activites', activites); }
  public strict(strictMode: boolean) { return this.updateStateProperty('strict', strictMode); }
  public key(keyName: string) { return this.updateStateProperty('key', keyName); }
  public onEntry(entryActions: any) { return this.updateStateProperty('entry', entryActions); }
  public onExit(entryActions: any) { return this.updateStateProperty('exit', entryActions); }
  public onDone(entryActions: any) { return this.updateStateProperty('onDone', entryActions); }
  public onError(entryActions: any) { return this.updateStateProperty('onError', entryActions); }
  public then(entryActions: any) { return this.updateStateProperty('onDone', entryActions); }
  public catch(entryActions: any) { return this.updateStateProperty('onError', entryActions); }
  public updateStateProperty(statePropertyName, statePropertyData, chainMethods?) {
    const isFunction = typeof statePropertyData === 'function';
    const value = isFunction ? statePropertyData(xState.actions) : statePropertyData;

    const isState = value instanceof StateBuilder;
    this.assignConfig({ 
      [statePropertyName] : isState ? value._id : value 
    });

    return chainMethods || this.getChainMethods();
  }

  public on(eventName: string, ...args) : TransitionBuilder<any, StateBuilder<T>> {
    const currentConfig = this.getConfig() || {};

    const transitionBuilder = new TransitionBuilder<any, StateBuilder<T>>({
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

  public onEach(eventNames: string[], ...args) {
    const currentConfig = this.getConfig() || {};

    const transitionBuilder = new TransitionBuilder<any, StateBuilder<T>>({
      parent: this,
      getConfig: () => {
        if (!currentConfig.on) {
          currentConfig.on = {};
        }

        return currentConfig.on[eventNames[0]] || {};
      },
      setConfig: (newConfig) => {
        if (!currentConfig.on) {
          currentConfig.on = {};
        }

        eventNames.forEach(eventName => {
          currentConfig.on[eventName] = newConfig;
        })
      },
    });

    const isTarget = typeof args[0] === 'string' || args[0] instanceof StateBuilder;
    if (isTarget) {
        const target = args.pop();
        transitionBuilder.target(target, ...args);
        args.pop();
    }

    transitionBuilder.handleCall(args);
    return transitionBuilder;
  }

  public node<NAME extends string>(stateName: NAME, ...args) : StateBuilder<NAME> {
    const currentConfig = this.getConfig();

    if (!currentConfig.initial && currentConfig.type !== 'parallel') {
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

  public deleteNode(nodeName: string) {
    const currentConfig = this.getConfig();
    const nodeToDelete = currentConfig.states[nodeName];

    if (!nodeToDelete) {
      return;
    }

    delete currentConfig.states[nodeName];

    const wasInitialState = currentConfig.initial === nodeName;
    if (wasInitialState) {
      delete currentConfig.initial;
    }

    const hasOtherStates = Object.keys(currentConfig.states).length > 0;
    if (!hasOtherStates) {
      delete currentConfig.states;
    }

    this.setConfig(currentConfig);
    return nodeToDelete;
  }

  public history(stateName, ...args) : HistoryBuilder {
    const historyConfig = {
      [stateName]: {
        type: 'history',
      }
    };

    const historyBuilder = new HistoryBuilder(stateName, {
      getConfig: () => historyConfig[stateName],
      setConfig: value => {
        historyConfig[stateName] = {...historyConfig[stateName], ...value};
        this.assignKeyConfig('states', historyConfig);
      },
    });

    historyBuilder.handleCall(args, (obj) => {
      Object.keys(obj).forEach(objKey => {
        if (objKey === 'deep') {
          obj.history = 'deep';
          delete obj.deep;
        } else if (objKey === 'shallow') {
          obj.history = 'shallow';
          delete obj.shallow;
        }
      });

      return obj;
    });

    this.assignKeyConfig('states', historyConfig);

    return historyBuilder;
  }

  public invoke(...args) : InvokeBuilder {
    const currentConfig = this.getConfig();

    const invokeBuilder = new InvokeBuilder({
      parent: this,
      getConfig: () => currentConfig.invoke,
      setConfig: newData => currentConfig.invoke = newData,
    });

    invokeBuilder.handleCall(args);
    return invokeBuilder;
  }

  public addChildState(stateNode: StateBuilder<string>) {
    const thisConfig = this.getConfig();
    const childConfig = stateNode.getConfig();
    stateNode.setConfig(undefined)

    const shouldBeCompound = thisConfig.type !== 'parallel'
    const newAssignConfig : any = { 
      states: { 
        [stateNode._id]: childConfig 
      }
    };

    
    if (!thisConfig.initial && thisConfig.type !== 'parallel') {
      newAssignConfig.initial = stateNode._id;
    }
    
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

    this.assignConfig({ 'type': shouldBeCompound ? 'compound' : thisConfig.type });
    this.assignKeyConfig('states', newAssignConfig.states);
    return this;
  }

  public initial<NAME extends string>(stateNode: StateBuilder<NAME>) {
    this.assignConfig({ initial: stateNode._id });
  };

  public atomic(stateName?: T | any, ...args) { return this.updateOrCreateState(stateName, 'atomic', ...args); }
  public compound(stateName?: any, ...args) { return this.updateOrCreateState(stateName, 'compound', ...args); }
  public parallel(stateName?: any, ...args) { return this.updateOrCreateState(stateName,'parallel', ...args); }
  public final(stateName?: any, ...args) { return this.updateOrCreateState(stateName,'final', ...args); }
  public transient(stateName?: any, ...args) { return this.updateOrCreateState(stateName,'atomic', ...args).on('', ''); }
  public switch(stateName?: any, ...args) { return this.updateOrCreateState(stateName,'atomic', ...args).on('', ''); }
  public choice(stateName?: any, ...args) { return this.updateOrCreateState(stateName,'atomic', ...args).on('', ''); }

  public states<T extends string>(stateName: T[] | T, ...otherStatesNames: T[]) : Record<T, StateBuilder<T>> & StateBuilder<T | string>[] {
    const allDefinedStates = [
      ...(Array.isArray(stateName) ? stateName : [stateName]),
      ...otherStatesNames,
    ];

    const states = [] as Record<T, StateBuilder<T>> & StateBuilder<T | string>[];
    allDefinedStates.forEach((state: string) => {
      const newState = this.atomic(state);
      states[state] = newState;
      states.push(newState);
    });

    return states;
  }

  private updateOrCreateState(stateName: any, type: string, ...args) : StateBuilder<string> {
    const isChildrenFn = typeof stateName === 'function' && ['parallel', 'compound'].includes(type);
    if (isChildrenFn) {
      this.updateStateProperty('type', type)
      stateName(this);
      return this;
    }

    if (stateName === undefined) {
      this.updateStateProperty('type', type);
      return this;
    }

    return this.node(stateName, { type }, ...args)
  }
}