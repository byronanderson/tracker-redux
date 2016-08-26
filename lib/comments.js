const _ = require('lodash');

function getAllComments(snapshot) {
  let storyComments = _.flatten(_.map(snapshot.stories, 'comments'));
  let epicComments = _.flatten(_.map(snapshot.epics, 'comments'));
  return storyComments.concat(epicComments);
}

function munge(comment) {
  let munged = _.pick(comment, 'id', 'text', 'person_id', 'created_at', 'updated_at', 'commit_type', 'commit_identifier');
  munged.google_attachment_ids = _.map(comment.google_attachments, 'id');
  munged.file_attachment_ids = _.map(comment.file_attachments, 'id');
  return munged;
}

function extractComments(snapshot) {
  return getAllComments(snapshot).map(munge);
}

const comments = function(state = {}, action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return _.keyBy(extractComments(action.project), 'id');
    case "LOAD_PAST_DONE_STORIES":
      let storyComments = _.flatten(_.map(action.stories, 'comments')).map(munge);
      let storyCommentsById = _.keyBy(storyComments, 'id');
      return {...state, ...storyCommentsById};
    case "RECEIVE_COMMAND":
      return action.command.results.reduce(processCommand, state);
    default:
      return state;
  }
}

function processCommand(state, result) {
  if (result.type === 'comment') {
    if (result.deleted) {
      return _.omit(state, result.id.toString());
    }
    let newComment = {
      ...state[result.id],
      ..._.omit(result, 'story_id', 'epic_id', 'type', 'google_attachments', 'file_attachments')
    };

    if (newComment.text === '') { delete newComment.text; }

    return {
      ...state,
      [result.id]: newComment
    };
  }

  if (result.type === 'file_attachment') {
    // not sure if this should remove deleted file attachments
    // because it is hard to know if they were removed from *every* story that had it
  }

  return state;
}

module.exports = comments;
