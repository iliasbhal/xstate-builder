import * as React from 'react';
import * as xState from 'xstate';
import { createMachineConfig } from './lib/createMachineConfig';

export default class Machine {
  public static Builder = createMachineConfig;

  // public static createMachine

  public static createService = (...args: any) => {
    const machineConfig = createMachineConfig(...args).getConfig();
    const xStateMachine = xState.createMachine(machineConfig);
    const machineService = xState.interpret(xStateMachine)

    machineService.start()

    return machineService;
  }

  public static useMachine = (...args) => {
    const machine = React.useMemo(() => Machine.createService(...args), []);
    const [ state, setState ] = React.useState(machine.initialState);
  
    React.useEffect(() => {
      machine.onTransition((currentState) => {
        setState(currentState);
      });
      
      machine.start();
      return () => {
        machine.stop();
      }
    }, []);
  
    const sendEvent = (action: string, value: any) => {
      const isInlineValue = typeof value !== 'object' || Array.isArray(value);
      const machineEvent = isInlineValue ? { value }
        : value;
  
      machine.send(action, machineEvent)
    };
  
    return {
      state: state,
      send: sendEvent,
      context: state.context as any || {},
      value: state.value,
    };
  };
}

