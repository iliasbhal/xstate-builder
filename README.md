## Why this package ?
Configuring a state machine using the Object Configuration Pattern is straightfoward.
But there is some flaws to it:
- it lacks to provide meaning to the code, therefore, regression can and will happen.
- it's hard to understand, JSON is very different and the reading pattern is not easy.

Using the Builder Pattern to create this object is what we need.
This abstraction can
- Autocomplete, Dynamic Typing and improved API discovery 👌.
- Easy to compose with any JS code to help you configure your machine.
- Ability to quickly have a clear view of all the different states of the machine.
- Write the same machine with fewer lines of code.
- Increase Maintainability: Easier to read and understand ( because of the fluent API ).
- Ability to organize the code in a way that makes the more sense to you, and not to the machine.
- Integrates with all the js/ts tools you already have

## What has been Done ✅

- [x] support for custom actions
- [x] support for activities
- [x] automatic intial state definition
- [x] support for compound states
- [x] support for parallel state
- [x] ability to use xstate object
- [ ] ... a lot of other things

## Examples

Example: Sequence Pattern:

```ts
const machineConfig = Machine.Builder(state => {
  const node1 = state.atomic('node-1');
  const node2 = state.atomic('node-2');
  const node3 = state.atomic('node-3');

  [node1, node2, node3].forEach((state, index, nodes) => {
    state.on('NEXT').target(nodes[index + 1] || nodes[0])
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
      },
    },
    'node-2': {
      type: 'atomic',
      on: {
        NEXT: 'node-3',
      },
    },
    'node-3': {
      type: 'atomic',
      on: {
        NEXT: 'node-1',
      },
    },
  },
}
```

Example 2: Simple State With Event Handler

```ts
const machineConfig = Machine.Builder(state => {
  state.atomic('atomic-node')
    .on('MOUSE_DOWN')
        .cond('GUARD').action('ACTION')
    .on('MOUSE_UP')
        .cond('GUARD2').action('ACTION2')
})

// SAME AS:

const machineConfig = {
  initial: 'atomic-node',
  states: {
    'atomic-node': {
      type: 'atomic',
      on: {
        MOUSE_DOWN: {
          cond: 'GUARD',
          action: 'ACTION',
        },
        MOUSE_UP: {
          cond: 'GUARD2',
          action: 'ACTION2',
        },
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
