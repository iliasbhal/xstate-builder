// tslint:disable

import { expect } from 'chai';
import Machine from '../index';

describe('test state machine', () => {

  // TODO: state names should be minifiable.
  // TODO add machine.defineNode .defineTransition etc etc
  //      and machine.useNode useTransition etc etc
  
  // console.log(JSON.stringify(machineConfig, null, 2));

  it('should able to add children using .children', () => {
    // example found on https://xstate.js.org/docs/guides/statenodes.html#state-node-types

    const machineConfig = Machine.Builder((machine) => {
      machine.id('fetch');

      const ressourceIds = ['resource1', 'resource2'];

      const idle = machine.state('idle');
      const pending = machine.state('pending');
      const success = machine.state('success');

      idle.on('FETCH').target(pending);

      pending.onDone(success);
      pending.parallel((parallel) => {
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
    
    expect(machineConfig).to.deep.equal({
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

})
