const _ = require('lodash');

const labels = function(state = {}, action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return _.keyBy(action.project.labels, 'id');
    case "RECEIVE_COMMAND":
      return action.command.results.reduce(processCommand, state);
    default:
      return state;
  }
}

function processCommand(state, result) {
  if (result.type !== 'label') {
    return state;
  }
  if (result.deleted) {
    return _.omit(state, result.id.toString());
  }
  return {
    ...state,
    [result.id]: {
      ...state[result.id],
      ..._.omit(result, 'type', 'project_id')
    }
  };
}

module.exports = labels;