const _ = require('lodash');

function storyIds(state = [], action) {
  switch (action.type) {
    case "RESET_PROJECT":
      return action.project.stories.map(s => s.id);
    case "LOAD_PAST_DONE_STORIES":
      let loadedPastDoneStoryIds = action.stories.map(story => story.id);
      return [...loadedPastDoneStoryIds, ..._.without(state, loadedPastDoneStoryIds)];
    case "RECEIVE_COMMAND":
      return processCommand(state, action.command);
    default:
      return state;
  }
}

// the only reason further down stories would *not* say an after_id would be that it came after the story before it
// *but*, how do you detect the ordering for the stories in the middle of a group?
// story 1, story 2, story 3, story 4 => another project, what is up with story 2 and 3?

function sortResults(results, ids) {
  return results.slice().sort(function(left, right) {
    // if (left.before_id === right.id) {
    //   return -1;
    // }

    // if (left.after_id === right.id) {
    //   return 1;
    // }

    // if (left.id === right.before_id) {
    //   return 1;
    // }

    // if (left.id === right.after_id) {
    //   return -1;
    // }

    // if (left.after_id && !right.after_id) {
    //   return -1;
    // }

    // if (left.before_id && !right.before_id) {
    //   return 1;
    // }
    return ids.indexOf(left.id) - ids.indexOf(right.id);
  });
}

function processCommand(state, command) {
  let storyResults = command.results.filter(result => result.type === 'story');
  let moving = _.some(storyResults, result => result.hasOwnProperty('before_id') || result.hasOwnProperty('after_id'))

  if (state.length === 0 && storyResults.length > 0) {
    return findMoveBlocks(storyResults)[0].map(s => s.id);
  } else if (command.type === 'multi_story_move_into_project') {
    return moveStoriesAroundInManyChunks(state, storyResults);
  } else if (moving) {
    return moveStoriesAroundInOneChunk(state, storyResults);
  } else {
    return storyResults.reduce(function(state, result) {
      if (result.deleted || result.moved) {
        return _.without(state, result.id);
      }

      return state;
    }, state);
  }
}

// fixture for moving a past done story about

function findMoveBlocks(storyResults) {
  let chunk = [storyResults[0]];
  let results = storyResults.slice(1);
  let done = false;
  while (!done) {
    let previousStory = _.find(results, result => result.before_id === chunk[0].id);
    let nextStory = _.find(results, result => result.after_id === chunk[chunk.length - 1].id);
    if (previousStory) { chunk.unshift(previousStory) }
    if (nextStory) { chunk.push(nextStory) }
    done = !previousStory && !nextStory;
    results = _.without(results, previousStory, nextStory);
  }
  if (results.length === 0) {
    return [chunk];
  } else {
    return [chunk, ...findMoveBlocks(results)]
  }
}

function moveStoriesAroundInManyChunks(state, storyResults) {
  let moveBlocks = findMoveBlocks(storyResults);

  return moveBlocks.reduce(
    (state, block) => moveStoriesAroundInOneChunk(state, block),
    state
  );
}

function moveStoriesAroundInOneChunk(state, storyResults) {
  storyResults = sortResults(storyResults, state);

  let ids = storyResults.map(result => result.id);
  let omitted = _.without.apply(undefined, [state, ...ids]);
  let afterIndex = omitted.indexOf(_.first(storyResults).after_id);
  if (afterIndex !== -1) {
    // console.log('afterIndex', afterIndex);
    let newState = omitted.slice();
    newState.splice.apply(newState, [afterIndex + 1, 0, ...ids]);
    return newState;
  }
  let beforeIndex = omitted.indexOf(_.last(storyResults).before_id);
  if (beforeIndex !== -1) {
    // console.log('beforeIndex', beforeIndex);
    let newState = omitted.slice();
    newState.splice.apply(newState, [beforeIndex, 0, ...ids]);
    return newState;
  }
  return state;
}

module.exports = storyIds;