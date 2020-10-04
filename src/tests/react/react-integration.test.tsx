import * as React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import * as xTest from '@xstate/test';
import * as xGraph from '@xstate/graph';

import Machine from '../../index';

describe('Machine.useMachine', () => {
  it('should be called only once', async () => {
    const buildFn = jest.fn((machine) => {
      machine.state('initial');
    });

    const TestComp = (props: { text: string }) => {
      const machine = Machine.useMachine('testMachine', buildFn);
      
      return (
        <span>
          {machine.value}
          {props.text}
        </span>
      )
    }

    const view = render(<TestComp text="hello1"/>);
    view.rerender(<TestComp text="hello2"/>)
    view.unmount();

    expect(buildFn).toHaveBeenCalledTimes(1);
  });

  it('should default context to empty object', async () => {
    let machine;
    const TestComp = (props: { text: string }) => {
      machine = Machine.useMachine('testMachine', (machine) => {
        machine.state('initial');
      });
      
      return (
        <span>
          {props.text}
        </span>
      );
    };

    render(<TestComp text="hello1"/>);
    expect(machine.context).toEqual({});
  });

  it('should be able to send events to machine', () => {
    const actionSpy = jest.fn();

    const TestComp = () => {
      const machine = Machine.useMachine('testMAchine', (machine) => {
        machine.state('initial');
        machine.context({
          value: 0,
        });

        machine.on('INCREMENT')
          .assign({
            value: actionSpy,
          })
      });
      
      return (
        <span onClick={() => machine.send('INCREMENT', 'AAAA')}>
          click {machine.context.value}
        </span>
      );
    };

    const view = render(<TestComp />);
    expect(actionSpy).not.toHaveBeenCalled();
    fireEvent.click(view.getByText('click 0'));
    expect(actionSpy).toHaveBeenCalled();

  });

  it('should be able to read context data', async () => {
    const TestComp = (props: { text: string }) => {
      const machine = Machine.useMachine('TestMachine', (machine) => {
        machine.state('initial');

        machine.context({
          value: 0,
        });

        machine.on('INCREMENT')
          .assign({
            value: (ctx, event) => {
              return ctx.value + 1;
            },
          })
      });
      
      return (
        <span onClick={() => machine.send('INCREMENT', 'AAAA')}>
          {machine.context.value}
        </span>
      );
    };

    const view = render(<TestComp text="hello1"/>);
    
    fireEvent.click(screen.getByText('0'));
    expect(view.getByText('1')).toBeDefined();

    fireEvent.click(screen.getByText('1'));
    expect(view.getByText('2')).toBeDefined();
  });

  it('should be able to create test plans', () => {

  })
});

class MachineTestRunner {
  machine: any;
  reachedNodes = new Set();

  constructor(machine) {
    this.machine = machine;
  }

  getAllNodesIds() {
    const stateNodes = xGraph.getStateNodes(this.machine.machine);
    return stateNodes.map(stateNode => stateNode.id);
  }

  getUnreachedNodes() {
    const allNodeIds = this.getAllNodesIds();
    const unreachedNodeIs = allNodeIds.filter(nodeId => !this.reachedNodes.has(nodeId));
    return unreachedNodeIs;
  }

  getTestContext() {
    return null;
  }

  runTest(testCallback) {
    const stateNodes = xGraph.getStateNodes(this.machine.machine);
    stateNodes.forEach((state) => {
      state.meta = state.meta || {}
      state.meta.test = (testContext, currentState) => {
        this.reachedNodes.add(state.id);
        return testCallback(testContext, currentState);
      };
    })

    const testModel = xTest.createModel(this.machine.machine)
      .withEvents({
        CLICK: {
          // cases: [{ value: 1 },{ value: 2 },{ value: 3 },{ value: 4 },{ value: 5 },{ value: 6 },{ value: 7 }],
          exec: (context, event) => {
            // console.log('CLICK', event);
          },
        },
        BACK: {
          // cases: [{ back: 1 }, { back: 2 }, { back: 3 }],
          exec: (context, event) => {
            // console.log('BACK');
          },
        },
      });

    const testPlans = testModel.getSimplePathPlans();
    describe('generated tests for machine: ' + this.machine.machine.id, () => {
      testPlans.forEach(plan => {
        // console.log(plan.state.value)
        plan.paths.forEach(path => {
          it(plan.description + path.description, async () => {
            const testContext = this.getTestContext();
            await path.test(testContext);
          });
        });
      });
      
      it.skip('every state should be visited', () => {
        const unreachedNodes = machineTestRunner.getUnreachedNodes();
        expect(unreachedNodes).toEqual([]);
      });
    })
  }

}

const machine = Machine.createService('test', (machine) => {
  const states = machine.states(['initial', 'active', 'end'])
  const onBack = machine.state('onback');

  states.forEach((state, i, arr) => {
    state.on('CLICK')
      .target(arr[i+1] || arr[0]);
  });

  // states.forEach((state, i, arr) => {
  //   state.on('BACK')
  //     .target(onBack);
  // });

  states[1].children((active) => {
    active.state('sub-active-on');
    active.state('sub-active-off');
  });
});

const machineTestRunner = new MachineTestRunner(machine);
machineTestRunner.runTest((context, state) => {

});
