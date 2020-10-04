// tslint:disable

import { expect } from 'chai';
import Machine from '../index';
import { assign, spawn } from 'xstate';

it('should be able to reproduce async sequence' , () => {
  // example found on: https://xstate.js.org/docs/patterns/sequence.html#sequence

  const getDataFromEvent = (context, event: any) => event.data;
  
  const machineConfig = Machine.Builder((machine) => {
    machine.id('friends');
    
    const gettingUser = machine.state('gettingUser');
    const gettingFriends = machine.state('gettingFriends')
    const success = machine.final('success');
    
    machine.context({
      userId: 42, 
      user: undefined, 
      friends: undefined,
    });

    gettingUser.invoke({ src: getUserInfo })
      .onDone(t => t
        .target(gettingFriends)
        .assign({
          user: getDataFromEvent
        })
      );

    gettingFriends.invoke({ src: getUserFriends })
      .onDone(t => t
        .target(success)
        .assign({
          friends: getDataFromEvent
        })
      );
  });
  
  expect(machineConfig.getConfig()).to.deep.equal({
    id: 'friends',
    context: { userId: 42, user: undefined, friends: undefined },
    initial: 'gettingUser',
    states: {
      gettingUser: {
        type: "atomic",
        invoke: {
          src: getUserInfo,
          onDone: {
            target: 'gettingFriends',
            actions: assign({
              user: getDataFromEvent,
            })
          }
        }
      },
      gettingFriends: {
        type: "atomic",
        invoke: {
          src: getUserFriends,
          onDone: {
            target: 'success',
            actions: assign({
              friends: getDataFromEvent
            })
          }
        }
      },
      success: {
        type: 'final'
      }
    }
  });

  function getUserInfo(context) {
    return fetch('/api/users/${context.userId}').then(response =>
      response.json()
    );
  }
  
  // Returns a Promise
  function getUserFriends(context) {
    const { friends } = context.user;
  
    return Promise.all(
      friends.map(friendId =>
        fetch('/api/users/${context.userId}/').then(response => response.json())
      )
    );
  }
});

it('should be able to reproduce basic sequence' , () => {
  // example found on: https://xstate.js.org/docs/patterns/sequence.html#sequence
  const machineConfig = Machine.Builder('step', (machine) => {
    machine.states(['one', 'two', 'three'])
      .forEach((state, i, states) => {
        const isFirst = i === 0;
        const isLast = i === states.length - 1;

        if (!isFirst) {
          state.on('PREV').target(states[i - 1])
        } 

        if (!isLast) {
          state.on('NEXT').target(states[i + 1])
        }

        if (isLast) {
          state.final();
        }
      })
  });

  expect(machineConfig.getConfig()).to.deep.equal({
    id: 'step',
    initial: 'one',
    states: {
      one: {
        type: "atomic",
        on: { NEXT: 'two' }
      },
      two: {
        type: "atomic",
        on: { NEXT: 'three', PREV: 'one' }
      },
      three: {
        type: 'final',
        on: { PREV: 'two' }
      }
    }
  })
})
it('should be able to reproduce deeply nested', () => {
    // example found on https://xstate.js.org/docs/guides/statenodes.html#state-node-types

    const machineConfig = Machine.Builder((machine) => {
      machine.id('fetch');

      const ressourceIds = ['resource1', 'resource2'];

      const idle = machine.state('idle');
      const pending = machine.state('pending');
      const success = machine.state('success');

      idle.on('FETCH').target(pending);

      pending.onDone(success)
        .parallel((parallel) => {
          ressourceIds.forEach((ressourceName) => {
            parallel.state(ressourceName)
              .compound(child => {
                  child.state('pending')
                    .on(`FULFILL.${ressourceName}`)
                    .target('success')

                  child.final('success')
              }) 
          })
        })

      success.compound((c) => {
        const items = c.state('items');
        const item = c.state('item');
        c.history('hist').shallow();

        items.on('ITEM.CLICK').target(item);
        item.on('BACK').target(items);
      })
    });

    expect(machineConfig.getConfig()).to.deep.equal({
      id: 'fetch',
      initial: 'idle',
      states: {
        idle: {
          type: 'atomic',
          on: {
            FETCH: 'pending'
          }
        },
        pending: {
          type: 'parallel',
          states: {
            resource1: {
              type: 'compound',
              initial: 'pending',
              states: {
                pending: {
                  type: "atomic",
                  on: {
                    'FULFILL.resource1': 'success'
                  }
                },
                success: {
                  type: 'final'
                }
              }
            },
            resource2: {
              type: 'compound',
              initial: 'pending',
              states: {
                pending: {
                  type: "atomic",
                  on: {
                    'FULFILL.resource2': 'success'
                  }
                },
                success: {
                  type: 'final'
                }
              }
            }
          },
          onDone: 'success'
        },
        success: {
          type: 'compound',
          initial: 'items',
          states: {
            items: {
              type: "atomic",
              on: {
                'ITEM.CLICK': 'item'
              }
            },
            item: {
              type: "atomic",
              on: {
                BACK: 'items'
              }
            },
            hist: {
              type: 'history',
              history: 'shallow'
            }
          }
        }
      }
    })
  })
