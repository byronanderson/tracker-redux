const tz = require('./TimezoneJS');
const _ = require('lodash');
const { createSelector } = require('reselect');

const currentProjectDate = createSelector(
  state => state.currentTime,
  state => state.timezone.olson_name,
  (time, timezone) => {
    let currentTime = new tz.Date(time, timezone);
    return new tz.Date(
      currentTime.getFullYear(),
      currentTime.getMonth(),
      currentTime.getDate(),
      timezone
    ).getTime();
  }
);

const doneCurrentIterations = createSelector(
  project => project.startTime,
  currentProjectDate,
  project => project.iterationLength,
  project => project.timezone.olson_name,
  project => project.iterationOverrides,
  (projectStart, now, iterationLength, timezone, overrides) => {
    let start = projectStart;
    let number = 1;
    let done = projectStart > now;

    let iterations = [];

    // console.time('done iterations');

    while (!done) {
      let iteration = {type: 'done', ...buildIteration(number, start, iterationLength, timezone, overrides)};
      iterations.push(iteration);
      number++;
      done = iteration.finish > now;
      start = iteration.finish;
    }
    if (iterations.length > 0) { iterations[iterations.length - 1].type = 'current'; }
    // console.timeEnd('done iterations');
    return iterations;
  }
);

const doneIterations = createSelector(
  doneCurrentIterations,
  (doneCurrent) => {
    return doneCurrent.slice(0, doneCurrent.length - 1);
  }
);

const shownIterationsStartTime = createSelector(
  doneIterations,
  project => project.doneIterationsToShow,
  project => project.startTime,
  project => project.pastDoneLoaded,
  (iterations, numToShow, projectStart, pastDoneLoaded) => {
    if (pastDoneLoaded) { return projectStart; }
    let relevantDoneIteration = iterations[iterations.length - numToShow];
    return relevantDoneIteration ? relevantDoneIteration.start : projectStart;
  }
);

const storyIds = createSelector(
  shownIterationsStartTime,
  state => state.storyIds,
  state => state.stories,
  (startTime, ids, values) => {
    return ids.filter(id => {
      let story = values[id];
      return !story || !story.accepted_at || (story.accepted_at >= startTime);
    });
  }
);

const filledDoneIterations = createSelector(
  doneIterations,
  storyIds,
  project => project.stories,
  shownIterationsStartTime,
  (iterations, storyIds, storyData, shownIterationsStartTime) => {
    let idsToPlace = storyIds.slice();
    function fits(id, iteration) {
      let story = storyData[id];
      return story.accepted_at && story.accepted_at >= iteration.start && new Date(story.accepted_at).getTime() < iteration.finish;
    }
    return iterations.filter(iter => iter.start >= shownIterationsStartTime).map(iteration => {
      let ids = [];
      while (idsToPlace[0] && fits(idsToPlace[0], iteration)) {
        ids.push(idsToPlace.shift());
      }
      return {...iteration, storyIds: ids};
    });
  }
);

const stories = createSelector(
  storyIds,
  state => state.stories,
  (ids, values) => {
    return ids.map(id => values[id]);
  }
);

function buildIteration(number, start, projectIterationLength, timezone, iterationOverrides) {
  const iterationSettings = _.find(iterationOverrides, {number: number});
  const iterationLength = iterationSettings && iterationSettings.length !== undefined ? iterationSettings.length : projectIterationLength;
  const finishDate = new tz.Date(start, timezone);
  finishDate.setDate(finishDate.getDate() + (iterationLength * 7));

  return {
    start: start,
    finish: finishDate.getTime(),
    number: number
  };
}

function iterationDetails(iterationOverrides, projectIterationLength, number) {
  let override = _.find(iterationOverrides, {number: number}) || {};
  return {
    teamStrength: typeof override.team_strength === 'undefined' ? 1 : override.team_strength,
    iterationLength: override.length || projectIterationLength,
  };
}

function backlogFits(project, iteration, story, capacity, current) {
  if (story.current_state !== 'unstarted') {
    return true;
  }

  if (!project.automaticPlanning && current) {
    return false;
  }

  if (story.story_type === 'release') {
    return true;
  }

  return capacity >= (story.estimate || 0);
}

const iterationCalculationMetadata = createSelector(
  project => project.iterationOverrides,
  project => project.iterationLength,
  project => project.timezone.olson_name,
  project => project.automaticPlanning,
  (iterationOverrides, iterationLength, timezone, automaticPlanning) => {
    return {iterationOverrides, iterationLength, timezone, automaticPlanning};
  }
);

function doFilledBacklogIterations(storyData, iterationCalculationMetadata, startOfCurrentIteration, iterationNumber, ids, velocity, carryover, current) {
  let idsLeft = ids.slice();
  let subjectIteration = {
    ...buildIteration(iterationNumber, startOfCurrentIteration, iterationCalculationMetadata.iterationLength, iterationCalculationMetadata.timezone, iterationCalculationMetadata.iterationOverrides),
    storyIds: [],
  };
  let iterations = [subjectIteration];
  let { teamStrength, iterationLength } = iterationDetails(iterationCalculationMetadata.iterationOverrides, iterationCalculationMetadata.iterationLength, iterationNumber);
  let adjustedVelocity = velocity * teamStrength * iterationLength / iterationCalculationMetadata.iterationLength;
  let capacity = adjustedVelocity + carryover;
  let done = idsLeft.length === 0;
  while (!done) {
    let story = storyData[idsLeft[0]];
    let fits = backlogFits(iterationCalculationMetadata, subjectIteration, story, capacity, current);
    if (fits) {
      capacity = capacity - (story.estimate || 0);
      subjectIteration.storyIds.push(idsLeft.shift());
      done = idsLeft.length === 0;
    } else {
      done = true;
    }
  }
  if (idsLeft.length > 0) {
    let carryoverForNextIteration = capacity;
    if (carryoverForNextIteration < 0) { carryoverForNextIteration = 0; }
    return [subjectIteration].concat(doFilledBacklogIterations(storyData, iterationCalculationMetadata, subjectIteration.finish, iterationNumber + 1, idsLeft, velocity, carryoverForNextIteration, false));
  } else {
    return [subjectIteration];
  }
}

function filledBacklogIterations(storyData, iterationCalculationMetadata, startOfCurrentIteration, iterationNumber, ids, velocity) {
  let iterations = doFilledBacklogIterations(storyData, iterationCalculationMetadata, startOfCurrentIteration, iterationNumber, ids.filter(id => storyData[id].current_state !== 'unscheduled'), velocity, 0, true);
  return iterations.map((iter, i) =>
    i === 0 ? {...iter, type: 'current'} : {...iter, type: 'backlog'}
  )
}

const velocity = createSelector(
  filledDoneIterations,
  project => project.velocityOverride,
  project => project.stories,
  project => project.velocityAveragedOver,
  project => project.initialVelocity,
  project => project.iterationLength,
  project => project.iterationOverrides,
  (doneIterations, velocityOverride, storyData, velocityAveragedOver, initialVelocity, projectIterationLength, iterationOverrides) => {
    if (velocityOverride) {
      return velocityOverride;
    }
    if (doneIterations.length < velocityAveragedOver) {
      return initialVelocity;
    }
    let iterations = doneIterations.slice().reverse().slice(0, velocityAveragedOver);

    let effectivePoints = iterations.map(iter => {
      let { teamStrength, iterationLength } = iterationDetails(iterationOverrides, projectIterationLength, iter.number);
      let points = iter.storyIds.map(id => storyData[id].estimate || 0).reduce((x, y) => x + y, 0);
      return points / teamStrength;
    });

    let effectiveLengths = iterations.map(iter => {
      let { teamStrength, iterationLength } = iterationDetails(iterationOverrides, projectIterationLength, iter.number);
      return iterationLength / projectIterationLength;
    });

    return Math.floor(sum(effectivePoints)/sum(effectiveLengths) || initialVelocity) || initialVelocity;
  }
);

function sum(nums) {
  return nums.reduce((memo, num) => memo + num, 0);
}

function average(nums) {
  if (nums.length === 0) { return; }
  return sum(nums)/nums.length;
}

const iterations = createSelector(
  storyIds,
  filledDoneIterations,
  velocity,
  project => project.startTime,
  project => project.stories,
  iterationCalculationMetadata,
  (ids, done, projectVelocity, projectStartTime, storyData, iterationCalculationMetadata) => {
    let usedIds =  _.flatten(done.map(iter => iter.storyIds));
    let leftoverIds = _.difference(ids, usedIds);
    let lastDoneIteration = done[done.length - 1];
    let currentIterationStart = lastDoneIteration ? lastDoneIteration.finish : projectStartTime;
    let currentIterationNumber = lastDoneIteration ? lastDoneIteration.number + 1 : 1;
    let backlog = filledBacklogIterations(storyData, iterationCalculationMetadata, currentIterationStart, currentIterationNumber, leftoverIds, projectVelocity);
    return done.concat(backlog);
  }
);

function wrappedIterations(project) {
  // console.time('iterations');
  let theData = iterations(project);
  // console.timeEnd('iterations');
  return theData;
}

const iceboxedStoryIds = createSelector(
  project => project.storyIds,
  project => project.stories,
  (ids, stories) => {
    return ids.filter(id => stories[id].current_state === 'unscheduled');
  }
);

module.exports = {
  stories,
  storyIds,
  iterations: wrappedIterations,
  shownIterationsStartTime,
  velocity,
  iceboxedStoryIds,
};