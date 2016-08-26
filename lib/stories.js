const _ = require('lodash');

function munge(story) {
  let munged = _.omit(story, 'labels', 'project_id', 'comments', 'tasks', 'owned_by_id');
  munged.comment_ids = _.map(story.comments, comment => comment.id);
  munged.follower_ids = story.follower_ids.slice().sort();
  munged.task_ids = _.map(story.tasks, task => task.id);
  return munged;
}

const stories = function(state = {}, action, memberships) {
  switch (action.type) {
    case "RESET_PROJECT":
      let project = action.project;
      let stories = project.stories.map(munge);
      return _.keyBy(stories, 'id');
    case "LOAD_PAST_DONE_STORIES":
      let newStoryData = _.keyBy(action.stories.map(munge), 'id');
      return {
        ...state,
        ...newStoryData,
      };
    case "RECEIVE_COMMAND":
      let priority = ['story', 'comment', 'task'];
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

const storyKeys = [
  'comment_ids',
  'created_at',
  'current_state',
  'follower_ids',
  'id',
  'label_ids',
  'name',
  'owner_ids',
  'requested_by_id',
  'story_type',
  'task_ids',
  'updated_at'
];

function processCommand(state, result, memberships) {
  if (result.type === 'story') {
    if (result.deleted || result.moved) {
      return _.omit(state, result.id.toString());
    }
    let newStory = {
      ...state[result.id],
      ..._.omit(result, 'type', 'project_id', 'labels', 'before_id', 'after_id', 'tasks', 'comments', 'owned_by_id'),
    };

    if (result.comments) {
      newStory.comment_ids = _.map(result.comments, 'id');
    }

    if (result.tasks) {
      newStory.task_ids = _.map(result.tasks, 'id');
    }

    if (result.follower_ids) {
      newStory.follower_ids = result.follower_ids.slice().sort();
    }

    if (!newStory.comment_ids) { newStory.comment_ids = []; }
    if (!newStory.task_ids) { newStory.task_ids = []; }

    if (newStory.deadline === null) { delete newStory.deadline }
    if (newStory.accepted_at === null) { delete newStory.accepted_at }
    if (newStory.estimate === -1) { delete newStory.estimate }
    if (newStory.integration_id === null) { delete newStory.integration_id }
    if (newStory.external_id === '') { delete newStory.external_id }


    if (_.difference(storyKeys, _.keys(newStory).sort()).length !== 0) {
      return state;
    }

    return {
      ...state,
      [result.id]: newStory
    };
  }

  if (result.type === 'comment' && result.story_id) {
    let story = state[result.story_id];
    if (story && !_.include(story.comment_ids, result.id)) {
      return {
        ...state,
        [story.id]: {
          ...story,
          comment_ids: [...story.comment_ids, result.id]
        }
      };
    }
  }

  if (result.type === 'comment' && result.deleted) {
    let story = _.find(state, story => _.include(story.comment_ids, result.id));
    if (story) {
      return {
        ...state,
        [story.id]: {
          ...story,
          comment_ids: _.without(story.comment_ids, result.id)
        }
      };
    }
  }

  if (result.type === 'task') {
    if (result.story_id) {
      let story = state[result.story_id];
      if (story) {
        let newTaskIds = story.task_ids.slice();
        newTaskIds = _.without(newTaskIds, result.id);
        let position = result.position ? result.position - 1 : story.task_ids.length;
        newTaskIds.splice(position, 0, result.id);
        return {
          ...state,
          [story.id]: {
            ...story,
            task_ids: newTaskIds
          }
        };
      }
    } else {
      let story = _.find(state, story => _.include(story.task_ids, result.id));
      if (story) {
        if (result.deleted) {
          return {
            ...state,
            [story.id]: {
              ...story,
              task_ids: _.without(story.task_ids, result.id)
            }
          };
        }

        if (typeof result.position !== 'undefined') {
          let newTaskIds = story.task_ids.slice();
          newTaskIds = _.without(newTaskIds, result.id);
          newTaskIds.splice(result.position - 1, 0, result.id);
          return {
            ...state,
            [story.id]: {
              ...story,
              task_ids: newTaskIds
            }
          };
        }
      }
    }
  }

  if (result.type === 'project_membership' && result.deleted) {
    let stories = {};
    let personId = _.find(memberships, {id: result.id}).person_id;
    _.each(state, function(story) {
      if (story.follower_ids.indexOf(personId) !== -1) {
        stories[story.id] = {
          ...story,
          follower_ids: _.without(story.follower_ids, personId)
        };
      } else {
        stories[story.id] = story;
      }
    });
    return stories;
  }

  return state;
}

module.exports = stories;