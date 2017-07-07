import _ from 'lodash';

const iterationOverrides = function(state = {}, action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return action.project.iteration_overrides;
    case "RECEIVE_COMMAND":
      return action.command.results.reduce(processCommand, state);
    default:
      return state;
  }
}

function processCommand(state = [], result) {
  if (result.type === 'iteration_override' || result.type === 'iteration') {
    let existingOverride = _.find(state, {number: result.number});
    if (existingOverride) {
      if (result.deleted) {
        return _.without(state, existingOverride);
      }
      let override = {...existingOverride, ..._.omit(result, 'type', 'finish')};
      if (typeof override.team_strength === 'undefined') { override.team_strength = 1; }
      if (override.length === 'default') { delete override.length; }

      if (override.length === undefined && override.team_strength === 1) {
        return _.without(state, existingOverride);
      }
      return _.sortBy([..._.without(state, existingOverride), override], override => override.number);
    } else {
      let override = _.omit(result, 'type', 'finish');
      if (typeof override.team_strength === 'undefined') { override.team_strength = 1; }
      if (override.length === 'default') { delete override.length; }
      return _.sortBy([...state, override], override => override.number);
    }
  }
  if (result.type === 'project' && (result.start_time || result.week_start_day || result.iteration_length)) {
    return [];
  }
  return state;
}

module.exports = iterationOverrides;