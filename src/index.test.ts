// tslint:disable

import { expect } from 'chai';
import Machine from './index';

describe('test state machine', () => {

  // TODO: state names should be minifiable.
  // TODO: add state.addChild(alreadyDefinedNode) to move a node from where it is defined
  //       to the node we called addChild on.
  // TODO add machine.defineNode .defineTransition etc etc
  //      and machine.useNode useTransition etc etc
  //      and .use(xstateConfig) of every builder to implement the builder

  it('should be able to create a transiant state', () => {
    const machineConfig = Machine.Builder((state) => {
      state.switch('transiant-example')
        .case('GUARD1').target('TARGET1')
        .case('GUARD1').target('TARGET2')
        .default('TARGET3');
    });

    expect(machineConfig).to.deep.equal({
      "initial": "transiant-example",
      "states": {
        "transiant-example": {
          "type": "atomic",
          "on": {
            "": [
              {
                "cond": "GUARD1",
                "target": "TARGET1"
              },
              {
                "cond": "GUARD1",
                "target": "TARGET2"
              },
              {
                "target": "TARGET3"
              }
            ]
          }
        }
      }
    })
  })
  it('should let define machine context', () => {
    const machineConfig = Machine.Builder((state) => {
      state.context({ test: true });
    });

    const machineConfigUsingFunction = Machine.Builder((state) => {
      state.context(() => ({ test: true }));
    });

    expect(machineConfig).to.deep.equal(machineConfigUsingFunction);
    expect(machineConfig).to.deep.equal({
      'context': {
        'test': true,
      },
    });
  });

  it('should work with array methods', () => {
    const machineConfig = Machine.Builder((state) => {
      const node1 = state.atomic('node-1');
      const node2 = state.atomic('node-2');
      const node3 = state.atomic('node-3');

      [node1, node2, node3].forEach((state, index, nodes) => {
        state.on('NEXT').target(nodes[index + 1] || nodes[0]);
      });
    });

    expect(machineConfig).to.deep.equal({
      'initial': 'node-1',
      'states': {
        'node-1': {
          'type': 'atomic',
          'on': {
            'NEXT': 'node-2',
          },
        },
        'node-2': {
          'type': 'atomic',
          'on': {
            'NEXT': 'node-3',
          },
        },
        'node-3': {
          'type': 'atomic',
          'on': {
            'NEXT': 'node-1',
          },
        },
      },
    });
  });

  it('should be able to add child state nodes', () => {
    const machineConfig = Machine.Builder((state) => {
      state.compound('atomic-node')
        .describe((child) => {
          child.atomic('CHILD_1').on('SOME_EVENT', 'TARGET_X');
          child.atomic('CHILD_2').on('ANOTHER_EVENT', 'TARGET_X');
        });
    });

    expect(machineConfig).to.deep.equal({
      'initial': 'atomic-node',
      'states': {
        'atomic-node': {
          'type': 'compound',
          'states': {
            'CHILD_1': {
              'type': 'atomic',
              'on': {
                'SOME_EVENT': 'TARGET_X',
              },
            },
            'CHILD_2': {
              'type': 'atomic',
              'on': {
                'ANOTHER_EVENT': 'TARGET_X',
              },
            },
          },
        },
      },
    });
  });

  it('should be able to chain several cond operations', () => {
    const machineConfig = Machine.Builder((state) => {
      state.atomic('atomic-node')
        .on('MOUSE_DOWN')
          .cond('GUARD').action('ACTION')
          .cond('GUARD2').action('ACTION2');
    });

    expect(machineConfig).to.deep.equal({
      'initial': 'atomic-node',
      'states': {
        'atomic-node': {
          'type': 'atomic',
          'on': {
            'MOUSE_DOWN': [
              { 'cond': 'GUARD', 'action': 'ACTION', },
              { 'cond': 'GUARD2', 'action': 'ACTION2', },
            ],
          },
        },
      },
    });
  });

  it('should access parent prototype builder if not in current builder', () => {
    const machineConfig = Machine.Builder((state) => {
      state.atomic('atomic-node')
        .on('MOUSE_DOWN').cond('GUARD').action('ACTION')
        .on('MOUSE_UP').cond('GUARD').action('ACTION');
    });

    expect(machineConfig).to.deep.equal({
      'initial': 'atomic-node',
      'states': {
        'atomic-node': {
          'type': 'atomic',
          'on': {
            'MOUSE_DOWN': {
              'cond': 'GUARD',
              'action': 'ACTION',
            },
            'MOUSE_UP': {
              'cond': 'GUARD',
              'action': 'ACTION',
            },
          },
        },
      },
    });
  });

  it('should let use this keyword with anonymous functions', () => {
    const machineConfig = Machine.Builder((state) => {
      state.atomic('atomic-node', function () {
        this.on('CLICK').target('SOMETHING');
      });
    });

    expect(machineConfig).to.deep.equal({
      'initial': 'atomic-node',
      'states': {
        'atomic-node': {
          'type': 'atomic',
          'on': {
            'CLICK': 'SOMETHING',
          },
        },
      },
    });
  });

  it('should let use state reference as target', () => {
    const machineConfig = Machine.Builder((state) => {
      const node1 = state.atomic('atomic-node');
      const node2 = state.atomic('atomic-node-2');
      node1.on('CLICK').target(node2);
      node2.on('CLICK').target(node1);
    });

    expect(machineConfig).to.deep.equal({
      'initial': 'atomic-node',
      'states': {
        'atomic-node': {
          'type': 'atomic',
          'on': {
            'CLICK': 'atomic-node-2',
          },
        },
        'atomic-node-2': {
          'type': 'atomic',
          'on': {
            'CLICK': 'atomic-node',
          },
        },
      },
    });
  });
});
