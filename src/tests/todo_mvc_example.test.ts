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

    commitTodoEvent: ctx => ({ type: "TODO.COMMIT", todo: ctx }),
    deleteTodoEvent: ctx => ({ type: "TODO.DELETE", id: ctx.id }),
    getTitle: (ctx : any) => ctx.title,
    isCompletedGuard: ctx => ctx.completed,
    hasTitle: ctx => ctx.title.trim().length > 0,
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
        action.sendParent(todosImpl.commitTodoEvent)
      ]);

    // define you states transitions
    deleted
      .onEntry((action) => action.sendParent(todosImpl.deleteTodoEvent));

    editing
      .onEntry((action) => action.assign({ prevTitle: todosImpl.getTitle }))
      .on('CHANGE').assign({ title: todosImpl.getValue})
      .on('COMMIT')
        .cond(todosImpl.hasTitle).sendParent(todosImpl.commitTodoEvent)
        .target("reading.hist")
        .default(deleted)
      .on('BLUR')
        .target(reading).sendParent(todosImpl.commitTodoEvent)
      .on('CANCEL')
        .target(reading)
        .assign({ title: todosImpl.getTitle })
    
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
            action.sendParent(todosImpl.commitTodoEvent),
          ])
        .on('TOGGLE_COMPLETE')
          .target(pending)
          .actions(action => [
            action.assign({ completed: false }),
            action.sendParent(todosImpl.commitTodoEvent),
          ])
        
      unknown
        .cond(todosImpl.isCompletedGuard).target(completed)
        .default(pending);
      
      pending.on('SET_COMPLETED').target(completed)
        .actions((action) => [
          action.assign({ completed: true }),
          action.sendParent(todosImpl.commitTodoEvent)
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
          sendParent(todosImpl.commitTodoEvent)
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
                { target: "completed", cond: todosImpl.isCompletedGuard },
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
                  sendParent(todosImpl.commitTodoEvent)
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
                  sendParent(todosImpl.commitTodoEvent)
                ]
              },
              SET_ACTIVE: {
                target: "pending",
                actions: [
                  assign({ completed: false }),
                  sendParent(todosImpl.commitTodoEvent)
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
        entry: assign({ prevTitle: todosImpl.getTitle }),
        on: {
          CHANGE: {
            actions: assign({
              title: todosImpl.getValue,
            })
          },
          COMMIT: [
            {
              target: "reading.hist",
              actions: sendParent(todosImpl.commitTodoEvent),
              cond: todosImpl.hasTitle,
            },
            { target: "deleted" }
          ],
          BLUR: {
            target: "reading",
            actions: sendParent(todosImpl.commitTodoEvent)
          },
          CANCEL: {
            target: "reading",
            actions: assign({ title: todosImpl.getTitle})
          }
        }
      },
      deleted: {
        "type": "atomic",
        entry: sendParent(todosImpl.deleteTodoEvent)
      }
    }
  })
})
