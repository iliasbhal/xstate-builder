import * as xState from 'xstate';
import { BaseMachineBuilder } from './baseMachineBuilder';
import { TransitionBuilder } from './transitionBuilder';

export class InvokeBuilder extends BaseMachineBuilder {
  public onDone = this.createScopedTransitionBuilder('onDone');
  public onComplete = this.onDone;
  public onFinal = this.onDone;
  public finally = this.onDone;
  public then = this.onDone;

  public onError = this.createScopedTransitionBuilder('onError');
  public onException = this.onError;
  public catch = this.onError;

  protected createScopedTransitionBuilder(scopeName: string) {
    const createTransition = (eventName: string) => new TransitionBuilder({
      parent: this,
      getConfig: () => this.getConfig()[eventName],
      setConfig: value => {
        this.assignConfig({ [eventName]: value })
      },
    });

    return (transitionConfigFn) => {
      const builder = createTransition(scopeName);
      transitionConfigFn(builder);
      return this;
    };
  }
}