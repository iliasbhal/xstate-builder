// tslint:disable

import { expect } from 'chai';
import Machine from '../index';
import { assign, spawn, sendParent } from 'xstate';

it('should be able to reproduce TodoMVC example' , () => {
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
    
    isValid: (ctx, e) => !!e.value.trim().length,

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

  const todoMachine = Machine.Builder((machine) => {
    machine.id('todo');
    
    machine.context({
      id: undefined,
      title: "",
      prevTitle: ""
    });

    // Define you States;
    const reading = machine.state('reading');
    const editing = machine.state('editing');
    const deleted = machine.state('deleted');

    // Define your machine wide transitions
    machine.on('DELETE').target(deleted);
    machine.on('TOGGLE_COMPLETE')
      .target('.reading.completed')
      .actions((action) => [
        action.assign({ completed: true }),
        action.sendParent(ctx => ({ type: "TODO.COMMIT", todo: ctx }))
      ]);

    // define you states transitions
    deleted
      .onEntry((action) => action.sendParent(ctx => ({ type: "TODO.DELETE", id: ctx.id })));

    editing
      .onEntry((action) => action.assign({ prevTitle: (ctx : any) => ctx.title }))
      .on('CHANGE').assign({
        title: (ctx, e: any) => e.value
      })
      .on('COMMIT')
        .cond((t) => ctx => ctx.title.trim().length > 0)
        .actions(actions => actions.sendParent(ctx => ({ type: "TODO.COMMIT", todo: ctx })))
        .target("reading.hist")
        .default(deleted)
      .on('BLUR')
        .target(reading)
        .actions(action => action.sendParent(ctx => ({ type: "TODO.COMMIT", todo: ctx })))
      .on('CANCEL')
        .target(reading)
        .assign({ title: (ctx: any) => ctx.prevTitle })
    
    reading.on('EDIT').target(editing).actions('focusInput');
    reading.compound(() => {

      const unknown = reading.transient('unknown');
      const pending = reading.state('pending');
      const completed = reading.state('completed');
      reading.history('hist');
      
      completed
        .on('SET_ACTIVE')
          .target(pending)
          .actions(action => [
            action.assign({ completed: false }),
            action.sendParent(ctx => ({ type: "TODO.COMMIT", todo: ctx })),
          ])
        .on('TOGGLE_COMPLETE')
          .target(pending)
          .actions(action => [
            action.assign({ completed: false }),
            action.sendParent(ctx => ({ type: "TODO.COMMIT", todo: ctx })),
          ])
        
      unknown
        .cond(ctx => ctx.completed).target(completed)
        .default(pending);
      
      pending.on('SET_COMPLETED').target(completed)
        .actions((action) => [
          action.assign({ completed: true }),
          action.sendParent(ctx => ({ type: "TODO.COMMIT", todo: ctx }))
        ])
    });
  });

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

  console.log(JSON.stringify(todoMachine.getConfig(), null, 2));

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

  expect(todoMachine.getConfig()).to.deep.equal({
    id: "todo",
    initial: "reading",
    context: {
      id: undefined,
      title: "",
      prevTitle: ""
    },
    on: {
      TOGGLE_COMPLETE: {
        target: ".reading.completed",
        actions: [
          assign({ completed: true }),
          sendParent(ctx => ({ type: "TODO.COMMIT", todo: ctx }))
        ]
      },
      DELETE: "deleted"
    },
    states: {
      reading: {
        "type": "compound",
        initial: "unknown",
        states: {
          unknown: {
            "type": "atomic",
            on: {
              "": [
                { target: "completed", cond: ctx => ctx.completed },
                { target: "pending" }
              ]
            }
          },
          pending: {
            "type": "atomic",
            on: {
              SET_COMPLETED: {
                target: "completed",
                actions: [
                  assign({ completed: true }),
                  sendParent(ctx => ({ type: "TODO.COMMIT", todo: ctx }))
                ]
              }
            }
          },
          completed: {
            "type": "atomic",
            on: {
              TOGGLE_COMPLETE: {
                target: "pending",
                actions: [
                  assign({ completed: false }),
                  sendParent(ctx => ({ type: "TODO.COMMIT", todo: ctx }))
                ]
              },
              SET_ACTIVE: {
                target: "pending",
                actions: [
                  assign({ completed: false }),
                  sendParent(ctx => ({ type: "TODO.COMMIT", todo: ctx }))
                ]
              }
            }
          },
          hist: {
            type: "history"
          }
        },
        on: {
          EDIT: {
            target: "editing",
            actions: "focusInput"
          }
        }
      },
      editing: {
        "type": "atomic",
        entry: assign({ prevTitle: (ctx : any) => ctx.title }),
        on: {
          CHANGE: {
            actions: assign({
              title: (ctx, e: any) => e.value
            })
          },
          COMMIT: [
            {
              target: "reading.hist",
              actions: sendParent(ctx => ({ type: "TODO.COMMIT", todo: ctx })),
              cond: ctx => ctx.title.trim().length > 0
            },
            { target: "deleted" }
          ],
          BLUR: {
            target: "reading",
            actions: sendParent(ctx => ({ type: "TODO.COMMIT", todo: ctx }))
          },
          CANCEL: {
            target: "reading",
            actions: assign({ title: (ctx: any) => ctx.prevTitle })
          }
        }
      },
      deleted: {
        "type": "atomic",
        entry: sendParent(ctx => ({ type: "TODO.DELETE", id: ctx.id }))
      }
    }
  })

})


// given('I have 100 shares of MSFT stock')
//   .and('I have 150 shares of APPL stock')
//   .and('the time is before close of trading')
// .when('I ask to sell 20 shares of MSFT stock')
// .then('I should have 80 shares of MSFT stock')
//   .and('I should have 150 shares of APPL stock')
//   .and('a sell order for 20 shares of MSFT stock should have been executed')


// function given(args) {
//   return {
//     and: given,
//     when: given,
//     then: given,
//   }
// }