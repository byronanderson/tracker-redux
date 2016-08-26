const _ = require('lodash');

const epicIds = function(state = [], action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return _.map(action.project.epics, 'id');
    case "RECEIVE_COMMAND":
      return action.command.results.reduce(processCommand, state);
    default:
      return state;
  }
}

function processCommand(state, result) {
  if (result.type !== 'epic') {
    return state;
  }
  if (result.deleted) {
    return _.without(state, result.id);
  }
  if (result.before_id) {
    let newState = _.without(state, result.id);
    let relativeIndex = _.indexOf(newState, result.before_id);
    newState.splice(relativeIndex, 0, result.id);
    return newState;
  }
  if (result.after_id) {
    let newState = _.without(state, result.id);
    let relativeIndex = _.indexOf(newState, result.after_id);
    newState.splice(relativeIndex + 1, 0, result.id);
    return newState;
  }
  if (!_.include(state, result.id)) {
    return [...state, result.id];
  }
  return state;
}

module.exports = epicIds;