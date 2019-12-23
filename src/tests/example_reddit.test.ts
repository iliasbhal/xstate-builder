import { expect } from 'chai';
import { assign, sendParent, spawn, Spawnable } from 'xstate';
import Machine from '../index';


it('should be able to reproduce reddit example' , () => {

  function createSubredditMachine(subredditName) : any {
    return {};
  }

  function getContextOnSelect(context: any, event: any) {
    // Use the existing subreddit actor if one doesn't exist
    let subreddit = context.subreddits[event.name];

    if (subreddit) {
      return {
        ...context,
        subreddit
      };
    }

    // Otherwise, spawn a new subreddit actor and
    // save it in the subreddits object
    subreddit = spawn(createSubredditMachine(event.name));

    return {
      subreddits: {
        ...context.subreddits,
        [event.name]: subreddit
      },
      subreddit
    };
  }

  function invokeFetchSubreddit(context) {
    const { subreddit } = context;
  
    return fetch(`https://www.reddit.com/r/${subreddit}.json`)
      .then(response => response.json())
      .then(json => json.data.children.map(child => child.data));
  }

  const machineConfig = Machine.Builder((machine) => {
    machine.id('reddit');
    machine.context({
      subreddit: null,
      subreddits: {},
    });

    const idle = machine.state('idle');
    const selected = machine.state('selected');

    machine.on('SELECT')
      .assign(getContextOnSelect)
      .target('.selected');
  })

  expect(machineConfig.getConfig()).to.deep.equal({
    id: "reddit",
    initial: "idle",
    context: {
      subreddits: {},
      subreddit: null
    },
    states: { idle: {
      type: 'atomic',
    }, selected: {
      type: 'atomic',
    } },
    on: {
      SELECT: {
        target: ".selected",
        actions: assign(getContextOnSelect)
      }
    }
  })

  const getPostsAndUpdated = {
    posts: (_, event: any) => event.data,
    lastUpdated: () => Date.now()
  };

  const subredditConfig = Machine.Builder((machine) => {
    machine.id('subreddit');
    machine.context({
      subreddit: 'subredditName', // subreddit name passed in
      posts: null,
      lastUpdated: null
    });

    const loading = machine.state('loading');
    const loaded = machine.state('loaded');
    const failure = machine.state('failure');

    loaded.on('REFRESH').target(loading);
    failure.on('RETRY').target(loading);

    loading.invoke({ id: "fetch-subreddit", src: invokeFetchSubreddit})
      .catch(t => t.target(failure))
      .then(t => t
        .target(loaded)
        .assign(getPostsAndUpdated))
  });

  expect(subredditConfig.getConfig()).to.deep.equal({
    id: "subreddit",
    initial: "loading",
    context: {
      subreddit: 'subredditName', // subreddit name passed in
      posts: null,
      lastUpdated: null
    },
    states: {
      loading: {
        'type': 'atomic',
        invoke: {
          id: "fetch-subreddit",
          src: invokeFetchSubreddit,
          onDone: {
            target: "loaded",
            actions: assign(getPostsAndUpdated)
          },
          onError: "failure"
        }
      },
      loaded: {
        'type': 'atomic',
        on: {
          REFRESH: "loading"
        }
      },
      failure: {
        'type': 'atomic',
        on: {
          RETRY: "loading"
        }
      }
    }
  })
})