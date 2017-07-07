const _ = require('lodash');

function getAllComments(snapshot) {
  let storyComments = _.flatten(_.map(snapshot.stories, 'comments'));
  let epicComments = _.flatten(_.map(snapshot.epics, 'comments'));
  return storyComments.concat(epicComments);
}

function munge(fileAttachment) {
  return _.pick(fileAttachment, 'id', 'filename', 'uploader_id', 'created_at', 'content_type', 'size', 'download_url', 'thumbnailable', 'thumbnail_url', 'big_url', 'uploaded');
}

function filterFileAttachments(comment) {
  if (comment.attachments) {
    return comment.attachments.filter(item => item.kind === "file_attachment");
  } else if (comment.file_attachments) {
    return comment.file_attachments;
  }
  return [];
}

function extractFileAttachments(snapshot) {
  return _.flatten(getAllComments(snapshot).map(comment =>
    _.map(filterFileAttachments(comment), munge)
  ));
}

const fileAttachments = function(state = {}, action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return _.keyBy(extractFileAttachments(action.project), 'id');
    case "LOAD_PAST_DONE_STORIES":
      let storyComments = _.flatten(_.map(action.stories, 'comments'));
      let fileAttachments = _.flatten(_.map(storyComments, comment => comment.file_attachments)).map(munge);
      let fileAttachmentsById = _.keyBy(fileAttachments, 'id');
      return {...state, ...fileAttachmentsById};
    case "RECEIVE_COMMAND":
      return action.command.results.reduce(processCommand, state);
    default:
      return state;
  }
}

function processCommand(state, result) {
  if (result.type === 'file_attachment') {
    if (result.deleted) {
      // return _.omit(state, result.id.toString());
      // can't trust that it was actually deleted, they can be
      // attached to multiple comments according to fixtures
      return state;
    }
    let newAttachment = {
      ...state[result.id],
      ..._.omit(result, 'type', 'comment_id', 'height', 'width', 'thumbnail_url', 'download_url', 'big_url')
    };

    return {
      ...state,
      [result.id]: newAttachment
    };
  }

  return state;
}

module.exports = fileAttachments;
