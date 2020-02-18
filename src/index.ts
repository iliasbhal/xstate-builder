import { StateBuilder } from './lib/stateBuilder'; 

export default class Machine {
  public static Builder(builderFn: (state: StateBuilder) => void) {
    let data = {}
    const stateBuilder = new StateBuilder('machine', {
      getConfig: () => data,
      setConfig: newValue => data = newValue,
    });

    builderFn(stateBuilder);
  
    return stateBuilder;
  }
}

