const _ = require('lodash');

const tasks = function(state = {}, action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return _.keyBy(_.flatten(_.map(action.project.stories, 'tasks')), 'id');
    case "RECEIVE_COMMAND":
      return action.command.results.reduce(processCommand, state);
    default:
      return state;
  }
}

function processCommand(state, result) {
  if (result.type !== 'task') {
    return state;
  }
  if (result.deleted || result.moved) {
    return _.omit(state, result.id.toString());
  }
  return {
    ...state,
    [result.id]: {
      ...state[result.id],
      ..._.omit(result, 'type', 'position', 'story_id')
    }
  };
}

module.exports = tasks;