const _ = require('lodash');

const epics = function(state = {}, action, memberships) {
  switch (action.type) {
    case "RESET_PROJECT":
      let project = action.project;
      let epics = project.epics.map(epic => {
        let munged = _.omit(epic, 'project_id', 'comments', 'label');
        munged.follower_ids = epic.follower_ids.slice().sort();
        munged.comment_ids = _.map(epic.comments, comment => comment.id);
        return munged;
      });
      return _.indexBy(epics, 'id');
    case "RECEIVE_COMMAND":
      let priority = ['epic', 'comment'];
      let results = _.sortBy(action.command.results, result => {
        let p = priority.indexOf(result.type);
        if (p) { return -p }
        return -action.command.results.indexOf(result) - priority.length;
      });
      return results.reduce((state, result) => processCommand(state, result, memberships), state);
    default:
      return state;
  }
}

function processCommand(state, result, memberships) {
  if (result.type === 'epic') {
    if (result.deleted) {
      return _.omit(state, result.id.toString());
    }
    let newEpic = {
      ...state[result.id],
      ..._.omit(result, 'type', 'before_id', 'after_id', 'label', 'project_id')
    };

    if (!newEpic.comment_ids) { newEpic.comment_ids = []; }
    if (!newEpic.completed_at) { delete newEpic.completed_at; }

    if (result.follower_ids) {
      newEpic.follower_ids = result.follower_ids.slice().sort();
    }

    return {
      ...state,
      [result.id]: newEpic
    };
  }

  if (result.type === 'comment' && result.epic_id) {
    let epic = state[result.epic_id];
    if (epic && !_.include(epic.comment_ids, result.id)) {
      return {
        ...state,
        [epic.id]: {
          ...epic,
          comment_ids: [...epic.comment_ids, result.id]
        }
      };
    }
  }

  if (result.type === 'comment' && result.deleted) {
    let epic = _.find(state, epic => _.include(epic.comment_ids, result.id));
    if (epic) {
      return {
        ...state,
        [epic.id]: {
          ...epic,
          comment_ids: _.without(epic.comment_ids, result.id)
        }
      };
    }
  }

  if (result.type === 'project_membership' && result.deleted) {
    let epics = {};
    let personId = _.findWhere(memberships, {id: result.id}).person_id;
    _.each(state, function(epic) {
      if (epic.follower_ids.indexOf(personId) !== -1) {
        epics[epic.id] = {
          ...epic,
          follower_ids: _.without(epic.follower_ids, personId)
        };
      } else {
        epics[epic.id] = epic;
      }
    });
    return epics;
  }
  return state;
}

module.exports = epics;