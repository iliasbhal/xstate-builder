## Why this package ?
Configuring a state machine using the Object Configuration Pattern is straightfoward.
But there is some flaws to it:
- it lacks to provide meaning to the code, therefore, regression can and will happen.
- it's long to read, reading JSON is very different from code reading.
- composition is hard to achieve
- techincal debt is hight.

Using the Builder Pattern to create this object is what we need.
This abstraction can
- Autocomplete, Dynamic Typing and improved API discovery 👌.
- Easy to compose with any JS code to help you configure your machine.
- Ability to quickly have a clear view of all the different states of the machine.
- Write the same machine with fewer lines of code.
- Increase Maintainability: Easier to read and understand ( because of the fluent API ).
- Ability to organize the code in a way that makes the more sense to you, and not to the machine.
- Integrates with all the js/ts tools you already have

## Examples

Example: Sequence Pattern:

```ts
const machineConfig = Machine.Builder(machine => {
  const nodes = ['node-1', 'node-2', 'node-3', 'node-4];
  
  machine.states(nodes).forEach((state, index, nodes) => {
   const nextTarget = nodes[index + 1] || nodes[0];
   const prevTarget = nodes[index - 1] || nodes[nodes.length - 1];
   
   state.on('NEXT').target(nextTarget)
    .on('PREVIOUS').target(prevTarget);
   
  })
})

// SAME AS:

const machineConfig = {
  initial: 'node-1',
  states: {
    'node-1': {
      type: 'atomic',
      on: {
        NEXT: 'node-2',
        PREVIOUS: 'node-4',
      },
    },
    'node-2': {
      type: 'atomic',
      on: {
        NEXT: 'node-3',
        PREVIOUS: 'node-1',
      },
    },
    'node-3': {
      type: 'atomic',
      on: {
        NEXT: 'node-4',
        PREVIOUS: 'node-2',
      },
    },
    'node-4': {
      type: 'atomic',
      on: {
        NEXT: 'node-1',
        PREVIOUS: 'node-3',
      },
    },
  },
}
```

Example 2: Simple State With Event Handler

```ts
const machineConfig = Machine.Builder(state => {
  state.atomic('initialState')
    .onEach(['TAP', 'CLICK', 'LONGPRESS'])
      .if('IS_ACTIVE').do('SET_INACTIVE')
      .if('IS_INACTIVE').do('SET_ACTIVE')
})

// SAME AS:

const machineConfig = {
  initial: 'initialState',
  states: {
    'initialState': {
      type: 'atomic',
      on: {
        TAP: [{
          cond: 'IS_ACTIVE',
          action: 'SET_INACTIVE',
        }, {
          cond: 'IS_INACTIVE',
          action: 'SET_ACTIVE',
        }],
        CLICK: [{
          cond: 'IS_ACTIVE',
          action: 'SET_INACTIVE',
        }, {
          cond: 'IS_INACTIVE',
          action: 'SET_ACTIVE',
        }],
        LONGPRESS: [{
          cond: 'IS_ACTIVE',
          action: 'SET_INACTIVE',
        }, {
          cond: 'IS_INACTIVE',
          action: 'SET_ACTIVE',
        }],
      },
    },
  },
}
```

Example 3: Transiant State

```ts
const machineConfig = Machine.Builder(state => {
  state.switch('transiant-example')
    .case('GUARD1').target('TARGET1')
    .case('GUARD1').target('TARGET2')
    .default('TARGET3')
})

const machineConfig = {
  initial: 'transiant-example',
  states: {
    'transiant-example': {
      type: 'atomic',
      on: {
        '': [
          {
            cond: 'GUARD1',
            target: 'TARGET1',
          },
          {
            cond: 'GUARD1',
            target: 'TARGET2',
          },
          {
            target: 'TARGET3',
          },
        ],
      },
    },
  },
}
```

## What has been Done ✅

- [x] support for custom actions
- [x] support for activities
- [x] automatic intial state definition
- [x] support for compound states
- [x] support for parallel state
- [x] ability to use xstate object
- [ ] ... a lot of other things
