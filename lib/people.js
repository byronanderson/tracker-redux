const _ = require('lodash');

const people = function(state = {}, action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return _.indexBy(_.pluck(action.project.memberships, 'person'), 'id');
    case "RECEIVE_COMMAND":
      return action.command.results.reduce(processCommand, state);
    default:
      return state;
  }
}

function processCommand(state, result) {
  if (result.type === 'person') {
    let newPerson = {
      ...state[result.id],
      ..._.omit(result, 'type', 'email')
    };

    return {
      ...state,
      [result.id]: newPerson
    };
  }
  return state;
}

module.exports = people;