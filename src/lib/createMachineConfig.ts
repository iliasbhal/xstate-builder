import { StateBuilder } from './stateBuilder'; 

type builderFunction = (state: StateBuilder<string>) => void;
type CreateMachineProp = [string, builderFunction] | [string];

export const createMachineConfig = (...args: CreateMachineProp | any) => {
  const machineId = typeof args[0] === 'string' ? args[0] : null;
  const builderFn = typeof args[0] === 'function' ? args[0] : args[1];

  let data = {}
  const stateBuilder = new StateBuilder(machineId || 'machine', {
    getConfig: () => data,
    setConfig: newValue => data = newValue,
  });

  if (machineId) {
    stateBuilder.id(machineId);
  }

  builderFn(stateBuilder);

  return stateBuilder;
};