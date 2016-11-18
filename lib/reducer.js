const _ = require('lodash');
const { combineReducers } = require('redux');
const tz = require('./TimezoneJS');
const { createSelector } = require('reselect');

function independentResultsReduce(reducer) {
  return function(state, action) {
    if (!action.results) { return (state || reducer(undefined, {type: 'INIT'})); }
    let priority = ['story', 'epic', 'comment', 'following'];
    let results = _.sortBy(action.results, result => {
      let p = priority.indexOf(result.type);
      if (p) { return -p }
      return -action.results.indexOf(result) - priority.length;
    });
    return results.reduce(reducer, state);
  }
}

function version(state = 1, action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return action.project.version;
    case "RECEIVE_COMMAND":
      return action.command.project.version;
    default:
      return state;
  }
}

function id(state = null, action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return action.project.id;
    default:
      return state;
  }
}

function pastDoneLoaded(state = false, action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return false;
    case "LOAD_PAST_DONE_STORIES":
      return true;
    default:
      return state;
  }
}

function reducePanic(state = false, action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return false;
    case "RECEIVE_COMMAND":
      return state || (action.command.type === 'multi_model_import');
    default:
      return state;
  }
}

const currentTime = (state = null, action) => {
  switch(action.type) {
    case "TICK":
      return action.time;
    default:
      return state;
  }
};

const projectField = (field, defaultValue) => {
  return function(state = defaultValue, action) {
    switch (action.type) {
      case "RESET_PROJECT":
        return action.project[field];
      case "RECEIVE_COMMAND":
        let value = state;
        action.command.results.forEach(function(result) {
          if (result.type === 'project' && result[field]) {
            value = result[field];
          }
        });
        return value;
      default:
        return state;
    }
    return state;
  };
};

const normalReduce = combineReducers({
  comments: require('./comments'),
  googleAttachments: require('./googleAttachments'),
  fileAttachments: require('./fileAttachments'),
  storyIds: require('./storyIds'),
  labels: require('./labels'),
  tasks: require('./tasks'),
  epicIds: require('./epicIds'),
  people: require('./people'),
  iterationOverrides: require('./iterationOverrides'),
  panic: reducePanic,
  pastDoneLoaded,
  // integrations,
  id,
  version,
  startTime: projectField('start_time', null),
  pointScale: projectField('point_scale', '0,1,2,3'),
  estimateBugsAndChores: projectField('bugs_and_chores_are_estimatable', false),
  iterationLength: projectField('iteration_length', 1),
  weekStartDay: projectField('week_start_day', 'Monday'),
  name: projectField('name', ''),
  public: projectField('public', false),
  doneIterationsToShow: projectField('number_of_done_iterations_to_show', 12),
  timezone: projectField('time_zone', null),
  updatedAt: projectField('updated_at', null),
  automaticPlanning: projectField('automatic_planning', true),
  velocityAveragedOver: projectField('velocity_averaged_over', 3),
  initialVelocity: projectField('initial_velocity', 10),
  currentTime,
});

const reduce = function(state = {}, action) {
  let {stories: oldStories, epics: oldEpics, memberships: oldMemberships, ...rest} = state;
  let stories = require('./stories')(oldStories, action, oldMemberships);
  let epics = require('./epics')(oldEpics, action, oldMemberships);
  let memberships = require('./memberships')(oldMemberships, action);
  return {
    ...normalReduce(rest, action),
    stories,
    epics,
    memberships,
  };
}

const fromIterations = require('./iterations');

const panic = createSelector(
  project => project.panic,
  fromIterations.stories,
  (explicitPanicState, stories) => {
    return explicitPanicState || _.some(stories, story => story === undefined);
  }
);

function estimateBugsAndChores(project) {
  return project.estimateBugsAndChores;
}

const pointScale = createSelector(
  project => project.pointScale,
  scale => scale.split(',').map(amt => parseInt(amt))
);

module.exports = {
  reducer: reduce,
  ...fromIterations,
  panic,
  tz,
  estimateBugsAndChores,
  pointScale,
};
