import Machine from '../../index';

describe('xstate integration', () => {
  it('should work with basic example from documentation', () => {
      const toggleMachine = Machine.createService('toggle', (machine) => {
        machine.states(['inactive', 'active'])
          .forEach((state, i, states) => {
            const theOtherState = states[i + 1] || states[i - 1];
            state.on('TOGGLE').target(theOtherState);
          }); 
      });

      const spy = jest.fn();

      toggleMachine.onTransition(spy);

      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({ value: "inactive" }),
        expect.any(Object)
      );

      toggleMachine.send('TOGGLE');
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({ value: "active" }),
        expect.any(Object)
      );
      
      toggleMachine.send('TOGGLE');
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({ value: "inactive" }),
        expect.any(Object)
      );

      toggleMachine.send('TOGGLE');
      expect(spy).toHaveBeenLastCalledWith(
        expect.objectContaining({ value: "active" }),
        expect.any(Object)
      );
  });
});