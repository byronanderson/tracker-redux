const _ = require('lodash');

function getAllComments(snapshot) {
  let storyComments = _.flatten(_.map(snapshot.stories, 'comments'));
  let epicComments = _.flatten(_.map(snapshot.epics, 'comments'));
  return storyComments.concat(epicComments);
}

function munge(attachment) {
  return _.pick(attachment, 'id', 'google_kind', 'person_id', 'resource_id', 'alternate_link', 'google_id', 'title');
}

function extractGoogleAttachments(snapshot) {
  return _.flatten(getAllComments(snapshot).map(comment =>
    _.map(comment.google_attachments, munge)
  ));
}

const googleAttachments = function(state = {}, action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return _.indexBy(extractGoogleAttachments(action.project), 'id');
    case "LOAD_PAST_DONE_STORIES":
      let storyComments = _.flatten(_.map(action.stories, 'comments'));
      let googleAttachments = _.flatten(_.map(storyComments, comment => comment.google_attachments)).map(munge);
      let googleAttachmentsById = _.indexBy(googleAttachments, 'id');
      return {...state, ...googleAttachmentsById};
    case "RECEIVE_COMMAND":
      return action.command.results.reduce(processCommand, state);
    default:
      return state;
  }
}

function processCommand(state, result) {
  if (result.type === 'google_attachment') {
    if (result.deleted) {
      return _.omit(state, result.id.toString());
    }
    let newAttachment = {
      ...state[result.id],
      ..._.omit(result, 'type', 'comment_id')
    };

    return {
      ...state,
      [result.id]: newAttachment
    };
  }

  return state;
}

module.exports = googleAttachments;
