import * as xState from 'xstate';
import { BaseMachineBuilder } from './baseMachineBuilder';
import { StateBuilder } from './stateBuilder';

type Condition<Context> = ((ctx: Context, event: xState.AnyEventObject ) => boolean) | string;

type ActionObject<Context> = xState.ActionObject<Context, xState.AnyEventObject>;
type ValidActions<Context> = string | string[] | Partial<ActionObject<Context>> | Array<Partial<ActionObject<Context>>>;
type Action<Context> = ((actions?: typeof xState.actions) => ValidActions<Context>) | ValidActions<Context>;
type Target = (StateBuilder | string) | Array<StateBuilder | string>
type TargetOptions = { internal: true, external?: false | undefined }
  | { internal?: false | undefined, external: true }
  | { internal?: false | undefined, external?: false | undefined }
export class TransitionBuilder<Context, ParentBuilder> extends BaseMachineBuilder {
  // aliases
  public if = this.cond;
  public elseif = this.cond;
  public case = this.cond;
  public guard = this.cond;

  public do = this.actions;
  public execute = this.actions;
  public call = this.actions;
  public then = this.actions;
  
  public redirect = this.target;
  public default = this.target;

  public doNothing = this.stop; // creates forbidden transition;
  public stopPropagation = this.stop; // creates forbidden transition;

  private updateHistory : string[] = [];
  public registerLastCommand(command) {
    this.updateHistory.push(command);
    if (this.updateHistory.length > 2) {
      this.updateHistory.shift();
    }
  }

  public action = (action) => this.actions([action]);

  public cond(condition: Condition<Context>) {
    const targetObject = {
      cond: condition,
    };

    this.updateTransition('cond', targetObject);
    return this.getChainMethods<ParentBuilder>();
  }

  public actions(action: Action<Context>) {
    const targetObject = {
      actions: typeof action === 'function' ? action(xState.actions) 
        : Array.isArray(action) && action.length === 1 ? action[0]
        : action,
    };

    this.updateTransition('actions', targetObject);
    return this.getChainMethods<ParentBuilder>();
  }

  public target(target: Target, type: TargetOptions = {}) {
    const targetObject = {
      target: Array.isArray(target) ? target.map((t) => this.getTargetId(t)) 
        : this.getTargetId(target),
      ...type,
    };

    this.updateTransition('target', targetObject);
    return this.getChainMethods<ParentBuilder>();
  }

  // shorthand methods
  public stop() { // creates forbidden transition;
    this.registerLastCommand('stop')
    return this.actions([]);
  }; 

  public send = (event: string, options: any) => this.actions(xState.actions.send(event, options));
  public sendParent = (event: string, options: any) => this.actions(xState.actions.sendParent(event, options));
  public respond = (actionName: string, options: any) => this.actions(xState.actions.respond(actionName, options));
  public raise = (actionName: string) => this.actions(xState.actions.raise(actionName));
  public forwardTo = (actionName: string) => this.actions(xState.actions.send(actionName, { to: actionName }));
  public forward = (actionName: string) => this.actions(xState.actions.send(actionName, { to: actionName }));
  public escalate = (actionName: string) => this.actions(xState.actions.escalate(actionName));
  public assign = (assignConfig: any) => this.actions(xState.actions.assign(assignConfig));
  public log = (expr?: any, label?: any) => this.actions(xState.actions.log(expr, label));
  public internal = (target: any) => this.target(target, { internal: true });
  public external = (target: any) => this.target(target, { internal: false });

  private getTargetId(target) : string {
    const rawTargetId = typeof target === 'string' ? target
      : target instanceof StateBuilder ? target._id 
      : target instanceof TransitionBuilder ? target.parent._id
      : null;

    // ensure to correctly reference child states.
    const currentContext = this.parent.getConfig();
    return this.adjustIdWithPath(rawTargetId, currentContext, '') || rawTargetId;
  }

  /**
   * TODO: improve pathfinder using a graph data-structure.
   */
  private adjustIdWithPath(targetId: string, machineConfig: any, acc: string) : string {
    const childStates = Object.keys(machineConfig.states || {})
    const isChildState = childStates.includes(targetId);

    if (isChildState) {
      targetId = acc + '.' + targetId;
      return targetId;
    } 

    for (const stateName of childStates) {
      const targetIdWithPath = this.adjustIdWithPath(targetId, machineConfig.states[stateName], '.' + stateName)
      if (targetIdWithPath) {
        return targetIdWithPath;
      }
    }

    return undefined;
  }

  private updateTransition(key:string, targetObject) {
    this.registerLastCommand(key);

    let transitionConfig = this.getConfig();

    const isUndefined = typeof transitionConfig === 'undefined';
    const isEmptyObject = !isUndefined && Object.keys(transitionConfig).length === 0;
    if (isUndefined || isEmptyObject) {
      if (key === 'target') {
        return this.setConfig(targetObject.target);
      }

      return this.setConfig({
        ...transitionConfig,
        ...targetObject,
      });
    }

    // When we use strings, xstate will use it as a target reference.
    // Ensure to normalize the transition into an object for the rest of the computation
    const isString = typeof transitionConfig === 'string';
    if (isString) {
      transitionConfig = {
        target: transitionConfig,
      };
    }

    const isObject = typeof transitionConfig === 'object';
    const isAlreadyDefined = !!transitionConfig[key];
    const isArray = Array.isArray(transitionConfig);
    if (isObject && !isArray && !isAlreadyDefined) {
      return this.setConfig({
        ...transitionConfig,
        ...targetObject,
      });
    }
    
    const shouldConcatenateTarget = this.updateHistory[0] === key && key!== 'target';
    if (shouldConcatenateTarget) {

      const lastConfig = isArray 
        ? transitionConfig[transitionConfig.length - 1]
        : transitionConfig;

      const isArrayAtKey = Array.isArray(lastConfig[key]);
      if (!isArrayAtKey) {
        lastConfig[key] = [lastConfig[key]]
      }
      
      const isTargetArray = Array.isArray(targetObject[key]);
      if (isTargetArray) {
        lastConfig[key].push(...targetObject[key]) 
      } else {
        lastConfig[key].push(targetObject[key]) 
      }
      
      return this.setConfig(transitionConfig);
    }

    if (!isArray) {
      transitionConfig = [transitionConfig];
    }

    const lastBeforeEnd = Array.from(transitionConfig)
      .reverse().findIndex(on => !on[key]);
    if (lastBeforeEnd !== -1) {
      const index = transitionConfig.length - 1 - lastBeforeEnd;
      transitionConfig[index] = {...transitionConfig[index], ...targetObject};
      return this.setConfig(transitionConfig);
    }

    transitionConfig.push(targetObject);
    return this.setConfig(transitionConfig);
  }
}