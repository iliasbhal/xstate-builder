import { expect } from 'chai';
import * as xState from 'xstate';
import Machine from '../index';

describe('test state machine', () => {
  it('should work with state machine 3/24', () => {
    // https://dev.to/codingdive/state-machine-advent-baby-s-first-state-machine-with-xstate-3-24-3b62', 

    const machine = Machine.Builder((machine) => {
      machine.id('lightSwitch');

      const states = machine.states('inactive', 'active');
      states.inactive.on('TOGGLE').target(states.active);
      states.active.on('TOGGLE').target(states.inactive);
    })

    expect(machine.getConfig()).to.deep.equal({
      id: 'lightSwitch',
      initial: 'inactive',
      states: {
        active: {
          "type": "atomic",
          on: {
            TOGGLE: 'inactive'
          }
        },
        inactive: {
          "type": "atomic",
          on: {
            TOGGLE: 'active'
          }
        },
      }
    });
  })

  it('should work with state machine 9/24', () => {
    // https://dev.to/codingdive/state-machine-advent-introduction-to-nested-and-parallel-states-using-statecharts-7ed
    const machine = Machine.Builder((machine) => {
      machine.id('videoChat');

      machine.parallel((state) => {
        createToggleState('audio');
        createToggleState('video');

        function createToggleState(stateName: string) { 
          state.compound(stateName).children(child => {
            const childStates = child.states('disabled', 'enabled');

            childStates.disabled
              .on(`ENABLE_${stateName.toUpperCase()}`)
              .target(childStates.enabled);
            
            childStates.enabled
              .on(`DISABLE_${stateName.toUpperCase()}`)
              .target(childStates.disabled);
          });
        }
      })
    });

    expect(machine.getConfig()).to.deep.equal({
      id: 'videoChat',
      type: 'parallel',
      states: {
        audio: {
          initial: 'disabled',
          "type": "compound",
          states: {
            disabled: {
              "type": "atomic",
              on: {
                ENABLE_AUDIO: 'enabled'
              }
            },
            enabled: {
              "type": "atomic",
              on: {
                DISABLE_AUDIO: 'disabled'
              }
            },
          }
        },
        video: {
          initial: 'disabled',
          "type": "compound",
          states: {
            disabled: {
              "type": "atomic",
              on: {
                ENABLE_VIDEO: 'enabled'
              }
            },
            enabled: {
              "type": "atomic",
              on: {
                DISABLE_VIDEO: 'disabled'
              }
            },
          }
        },
      }
    });
  })

  it('shoudl work with machine 12/24', () => {
    const machine = Machine.Builder((machine) => {
      machine.id('thermostat');
      machine.context({
        temperature: 20,
      });

      machine.states(['inactive', 'active'])
        .forEach((state, i, states) => {
          const otherState = i === 0 ? states[1] : states[0];
          state.on('POWER_TOGGLE').target(otherState)
        });
    });

    expect(machine.getConfig()).to.deep.equal({
      id: 'thermostat',
      initial: 'inactive',
      context: {
        temperature: 20,
      },
      states: {
        inactive: {
          "type": "atomic",
          on: {
            POWER_TOGGLE: 'active'
          }
        },
        active: {
          "type": "atomic",
          on: {
            POWER_TOGGLE: 'inactive',
          }
        },
      }
    })
  });

  it('should work with machine 13/24', () => {
    const assignTemprature = (context, event) => event.temperature;
    const machine = Machine.Builder((machine) => {
      machine.id('thermostat');
      machine.context({
        temperature: 20,
      });

      const states = machine.states(['inactive', 'active'])      
      states.forEach((state, i, states) => {
        const otherState = i === 0 ? states[1] : states[0];
        state.on('POWER_TOGGLE').target(otherState)

        if (state._id === 'active') {
          state.on('SET_TEMPERATURE').assign({
            temperature: assignTemprature
          })
        }
      });
    });

    expect(machine.getConfig()).to.deep.equal({
      id: 'thermostat',
      initial: 'inactive',
      context: {
        temperature: 20,
      },
      states: {
        inactive: {
          "type": "atomic",
          on: {
            POWER_TOGGLE: 'active'
          }
        },
        active: {
          "type": "atomic",
          on: {
            POWER_TOGGLE: 'inactive',
            SET_TEMPERATURE: {
              actions: xState.actions.assign({
                temperature: assignTemprature,
              }),
            }
          }
        },
      }
    })
  })

  it('should be able to reproduce 14/24', () => {
    const isUnder100Celcius = (context, event) => event.temperature < 100;
    const extractTemperaturFromEvent = (context, event) => event.temperature;
    
    const machine = Machine.Builder((machine) => {
      machine.id('thermostat');

      machine.assign({
        temperature: 20,
      });

      const states = machine.states('inactive', 'active')
      
      states.forEach((state, i) => {
        const otherState = states[i === 0 ? 1 : 0];
        state.on('POWER_TOGGLE').target(otherState);
      });
      
      states.active.on('SET_TEMPERATURE').if(isUnder100Celcius).assign({
        temperature: extractTemperaturFromEvent,
      });
    });

    expect(machine.getConfig()).to.deep.equal({
      id: 'thermostat',
      initial: 'inactive',
      context: {
        temperature: 20,
      },
      states: {
        inactive: {
          "type": "atomic",
          on: {
            POWER_TOGGLE: 'active'
          }
        },
        active: {
          "type": "atomic",
          on: {
            POWER_TOGGLE: 'inactive',
            SET_TEMPERATURE: {
              cond: isUnder100Celcius,
              actions: xState.assign({
                temperature: extractTemperaturFromEvent,
              }),
            }
          }
        },
      }
    });
  })

  it('should be able to reproduce 15 / 24', () => {
    const isUnder100Celcius = (context, event) => event.temperature < 100;
    const isCold = (ctx, event) => event.temperature < 18;
    const extractTemperaturFromEvent = (context, event) => event.temperature;
    
    const machine = Machine.Builder((machine) => {
      machine.id('thermostat');

      machine.assign({
        temperature: 20,
      });

      const states = machine.states('inactive', 'active')
      
      states.forEach((state, i) => {
        const otherState = states[i === 0 ? 1 : 0];
        state.on('POWER_TOGGLE').target(otherState);
      });
      
      const activeState = states.active;
      const { warm, cold } = activeState.states('warm', 'cold');

      activeState.on('SET_TEMPERATURE')
        .if(isCold).assign({ temperature: extractTemperaturFromEvent }).target(cold)
        .assign({ temperature: extractTemperaturFromEvent }).target(warm);
    });


    expect(machine.getConfig()).to.deep.equal({
      id: 'thermostat',
      initial: 'inactive',
      context: {
        temperature: 20,
      },
      states: {
        inactive: {
          "type": "atomic",
          on: {
            POWER_TOGGLE: 'active'
          }
        },
        active: {
          initial: 'warm',
          "type": "atomic",
          states: {
            cold: { "type": "atomic" },
            warm: { "type": "atomic" },
          },
          on: {
            POWER_TOGGLE: 'inactive',
            SET_TEMPERATURE: [
                {
                  target: '.cold',
                  cond: isCold,
                  actions: xState.assign({
                    temperature: extractTemperaturFromEvent,
                  }),
                },
                {
                  // transition without a guard as a fallback.
                  target: '.warm',
                  actions: xState.assign({
                    temperature: extractTemperaturFromEvent,
                  }),
                },
             ]
          }
        },
      }
    });
  })

  it('should be able to reproduce 17/24' , () => {    
    const machine = Machine.Builder((machine) => {
      machine.id('thermostat');

      machine.assign({
        temperature: 20,
      });

      const states = machine.states('inactive', 'active')

      states.forEach((state, i) => {
        const otherState = states[i === 0 ? 1 : 0];
        state.on('POWER_TOGGLE').target(otherState);
      });
      
      const temperatureStates = [
        { name: 'freezing', threshold: 0 },
        { name: 'cold', threshold: 18 },
        { name: 'warm', threshold: 30 },
        { name: 'hot' },
      ];

      const initialActive = states.active.transient('initializing');
      const eventListener = states.active.on('SET_TEMPERATURE');
      temperatureStates.forEach(({ name, threshold }) => {
        const tempreatureState = states.active.atomic(name);
        addTransitionTemperature(eventListener, tempreatureState, threshold);
        addTransitionTemperature(initialActive, tempreatureState, threshold);
      });

      function addTransitionTemperature(eventListener, target, threshold: number) {
        const transition = eventListener.target(target).do('assignTemperature');
        if (threshold !== undefined) {
          transition.if({
            type: 'isTemperatureBelow',
            temperatureThreshold: threshold, 
          });
        }
      }
    });


    expect(machine.getConfig()).to.deep.equal({
      id: 'thermostat',
      initial: 'inactive',
      context: {
        temperature: 20,
      },
      states: {
        inactive: {
          "type": "atomic",
          on: {
            POWER_TOGGLE: 'active'
          }
        },
        active: {
          "initial": "initializing",
          "type": "atomic",
          states: {
            initializing: {
              "type": "atomic",
              "on": {
                "": [
                  {
                    "actions": "assignTemperature",
                    "cond": {
                      "temperatureThreshold": 0,
                      "type": "isTemperatureBelow",
                    },
                    "target": "freezing",
                  },
                  {
                    "actions": "assignTemperature",
                    "cond": {
                      "temperatureThreshold": 18,
                      "type": "isTemperatureBelow",
                    },
                    "target": "cold",
                  },
                  {
                    "actions": "assignTemperature",
                    "cond": {
                      "temperatureThreshold": 30,
                      "type": "isTemperatureBelow",
                    },
                    "target": "warm",
                  },
                  {
                    "actions": "assignTemperature",
                    "target": "hot",
                  },
                ],
              },
            },
            freezing: { "type": "atomic" },
            cold: { "type": "atomic" },
            warm: { "type": "atomic" },
            hot: { "type": "atomic" },
          },
          on: {
            POWER_TOGGLE: 'inactive',
            SET_TEMPERATURE: [
              {
                target: '.freezing',
                cond: {
                  type: 'isTemperatureBelow',
                  temperatureThreshold: 0, 
                },
                actions: 'assignTemperature',
              },
              {
                target: '.cold',
                cond: {
                  type: 'isTemperatureBelow',
                  temperatureThreshold: 18, 
                },
                actions: 'assignTemperature',
              },
              {
                target: '.warm',
                cond: {
                  type: 'isTemperatureBelow',
                  temperatureThreshold: 30, 
                },
                actions: 'assignTemperature',
              },
              {
                target: '.hot',
                actions: 'assignTemperature',
              },
            ]
          }
        },
      }
    });
  })
});