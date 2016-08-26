const _ = require('lodash');

const memberships = function(state = {}, action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return _.sortBy(_.map(action.project.memberships, mem => {
        let membership = _.omit(mem, 'person');
        membership.person_id = mem.person.id;
        return membership;
      }), mem => mem.person_id);
    case "RECEIVE_COMMAND":
      return action.command.results.reduce(processCommand, state);
    default:
      return state;
  }
}

function processCommand(state, result) {
  const sortById = function(arr) {
    return _.sortBy(arr, elem => elem.person_id);
  }

  if (result.type === 'project_membership') {
    let existingMembership = _.find(state, {id: result.id});
    let oldMembership = _.find(state, {person_id: result.person_id});
    let newMembership;
    if (result.deleted && existingMembership) {
      newMembership = {
        ..._.omit(existingMembership, 'id', 'last_viewed_at'),
        role: 'inactive',
        will_receive_mention_notifications_or_emails: false,
        wants_comment_notification_emails: false,
      };
    } else if (existingMembership) {
      newMembership = {
        ...existingMembership,
        ...result
      };
    } else if (oldMembership) {
      newMembership = {
        ...oldMembership,
        ...result
      };
    } else {
      newMembership = result;
    }
    return sortById([
      ..._.without(state, oldMembership, existingMembership),
      _.omit(newMembership, 'type', 'updated_at', 'created_at', 'project_id', 'project_color')
    ]);
  }
  return state;
}

module.exports = memberships;