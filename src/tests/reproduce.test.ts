// tslint:disable

import { expect } from 'chai';
import Machine from '../index';
import { assign, spawn } from 'xstate';

it('should be able to reproduce TodoMVC example' , () => {
  const actions = {
    clearCompleted: ctx => ctx.todos.filter(todo => !todo.completed),
  }

  const todoMachine = Machine.Builder(() => {

  })


  const todosImpl = {
    createTodo: (title) => {
      return {
        id: Math.random().toString(),
        title: title,
        completed: false
      }
    },

    markCompleted: ctx => ctx.todos.forEach(todo => todo.ref.send("SET_COMPLETED")),
    clearCompleted: ctx => ctx.todos.filter(todo => !todo.completed),
    deleteTodo: (ctx, e) => ctx.todos.filter(todo => todo.id !== e.id),
    setActive: ctx => ctx.todos.forEach(todo => todo.ref.send("SET_ACTIVE")),
    getValue: (ctx, e) => e.value,
    
    isValid: (ctx, e) => e.value.trim().length,

    getTodoWithMachine: (ctx, e) => {
      return ctx.todos.map(todo => ({
        ...todo,
        ref: spawn(todoMachine.withContext(todo))
      }));
    },

    initializeTodo: (ctx, e) => {
      return ctx.todos.map(todo => ({
        ...todo,
        ref: spawn(todoMachine.withContext(todo))
      }));
    },

    newCommitTodo: (ctx, e) => { 
      const newTodo = todosImpl.createTodo(e.value.trim());
      return ctx.todos.concat({
        ...newTodo,
        ref: spawn(todoMachine.withContext(newTodo))
      });
    },

    todoCommit: (ctx, e) => {
      return ctx.todos.map(todo => {
        return todo.id === e.todo.id
          ? { ...todo, ...e.todo, ref: todo.ref }
          : todo;
      })
    },

  };

  const machineConfig = Machine.Builder((machine) => {
    machine.id('todos');
    machine.context({
      todo: '',
      todos: [],
    });

    const initializing = machine.transient('initializing');
    const all = machine.state('all');
    const active = machine.state('active');
    const completed = machine.state('completed');

    initializing.target(all)
      .onEntry(t => t.assign({
        todos: todosImpl.initializeTodo,
      }));

    machine.on("SHOW.all").target('.all');
    machine.on("SHOW.active").target('.active');
    machine.on("SHOW.completed").target('.completed');

    machine.on("NEWTODO.CHANGE").assign({
      todo: todosImpl.getValue,
    });

    machine.on("NEWTODO.COMMIT")
      .if(todosImpl.isValid)
      .actions((action) =>  [
        action.assign({
          todo: "", // clear todo
          todos: todosImpl.newCommitTodo,
        }),
        "persist"
      ]);

    machine.on("TODO.COMMIT")
      .actions((action) =>  [
        action.assign({
          todos: todosImpl.todoCommit,
        }),
        "persist"
      ]);

    machine.on("TODO.DELETE")
      .actions((action) => [
        action.assign({
          todos: todosImpl.deleteTodo,
        }),
        "persist"
      ]);

    machine.on("MARK.completed").actions(() => todosImpl.markCompleted);
    machine.on("MARK.active").actions(() => todosImpl.setActive);

    machine.on("CLEAR_COMPLETED").assign({
      todos: todosImpl.clearCompleted,
    });
  });

  // console.log(JSON.stringify(machineConfig.getConfig(), null, 2));
  // console.log(machineConfig.getConfig());

  // return;
  expect(machineConfig.getConfig()).to.deep.equal({
    id: "todos",
    context: {
      todo: "", // new todo
      todos: []
    },
    initial: "initializing",
    states: {
      initializing: {
        "type": "atomic",
        entry: assign({
          todos: todosImpl.initializeTodo,
        }),
        on: {
          "": "all"
        }
      },
      "all": {
        "type": "atomic"
      },
      "active": {
        "type": "atomic"
      },
      "completed": {
        "type": "atomic"
      }
    },
    on: {
      "NEWTODO.CHANGE": {
        actions: assign({
          todo: todosImpl.getValue
        })
      },
      "NEWTODO.COMMIT": {
        actions: [
          assign({
            todo: "", // clear todo
            todos: todosImpl.newCommitTodo,
          }),
          "persist"
        ],
        cond: todosImpl.isValid,
      },
      "TODO.COMMIT": {
        actions: [
          assign({
            todos: todosImpl.todoCommit,
          }),
          "persist"
        ]
      },
      "TODO.DELETE": {
        actions: [
          assign({
            todos: todosImpl.deleteTodo,
          }),
          "persist"
        ]
      },
      "SHOW.all": ".all",
      "SHOW.active": ".active",
      "SHOW.completed": ".completed",
      "MARK.completed": {
        actions: todosImpl.markCompleted,
      },
      "MARK.active": {
        actions: todosImpl.setActive,
      },
      "CLEAR_COMPLETED": {
        actions: assign({
          todos: todosImpl.clearCompleted,
        })
      }
    }
  })

})
it('should be able to reproduce async sequence' , () => {
  // example found on: https://xstate.js.org/docs/patterns/sequence.html#sequence

  const getDataFromEvent = (context, event: any) => event.data;
  
  const machineConfig = Machine.Builder((machine) => {
    machine.id('friends');
    machine.context({
      userId: 42, 
      user: undefined, 
      friends: undefined,
    });

    const gettingUser = machine.state('gettingUser');
    const gettingFriends = machine.state('gettingFriends')
    const success = machine.final('success');


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

  const expectedConfig = {
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
  }
  
  expect(machineConfig.getConfig()).to.deep.equal(expectedConfig)

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
  const machineConfig = Machine.Builder((machine) => {
    machine.id('step');

    machine.states(['one', 'two', 'three'])
      .forEach((step, i, steps) => {
        const isFirst = i === 0;
        const isLast = i === steps.length - 1;

        if (!isFirst) {
          step.on('PREV').target(steps[i - 1])
        } 

        if (!isLast) {
          step.on('NEXT').target(steps[i + 1])
        }

        if (isLast) {
          step.final();
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
