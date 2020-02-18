import { BaseMachineBuilder } from './baseMachineBuilder';
import { StateBuilder } from './stateBuilder';

export class HistoryBuilder extends BaseMachineBuilder {
  public _id: string;

  constructor(id, ...args) {
    super(...args);
    this._id = id;
  }

  public id = (id: string) => {
    this._id = id;
    this.assignConfig({ 'id': id });
  }

  public deep() {
    this.setConfig({ history: 'deep' })
    return this;
  }

  public shallow() {
    this.setConfig({ history: 'shallow' })
    return this;
  }

  public target(targetName) {
    const isStateBuilder = targetName instanceof StateBuilder;
    this.setConfig({ target: isStateBuilder ? targetName._id : targetName })
    return this;
  }
}