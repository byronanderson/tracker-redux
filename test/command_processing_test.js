"use strict";

const _ = require('lodash');
const tz = require('../lib/TimezoneJS');
const diff = require('deep-diff').diff;

let panicCases = {
"MultiModelImport-10369989": true,
"MultiModelImport-27257231": true,
"MultiModelImport-41139561": true,
"MultiModelImport-57194113": true,
"MultiModelImport-68525351": true,
"MultiModelImport-14769923": true,
"MultiModelImport-29023543": true,
"MultiModelImport-43472779": true,
"MultiModelImport-57624312": true,
"MultiModelImport-70900692": true,
"MultiModelImport-17599671": true,
"MultiModelImport-34692689": true,
"MultiModelImport-4353822": true,
"MultiModelImport-66418197": true,
"MultiModelImport-73275036": true,
"MultiModelImport-18920451": true,
"MultiModelImport-35768267": true,
"MultiModelImport-47499381": true,
"MultiModelImport-66729661": true,
"MultiModelImport-79622373": true,
"MultiModelImport-21958504": true,
"MultiModelImport-36355313": true,
"MultiModelImport-53050154": true,
"MultiModelImport-67005736": true,
"MultiModelImport-95851043": true,
"MultiModelImport-26540427": true,
"MultiModelImport-38149772": true,
"MultiModelImport-55647595": true,
"MultiModelImport-67682249": true,
"MultiModelImport-96947649": true,

"StoryUpdate-91016771": true,
"StoryUpdate-74832161": true,
};

let buggyPlatform = {
'MultiStoryDelete-19984752': true,
'MultiStoryDelete-34466002': true,
'MultiStoryDelete-35566115': true,
'MultiStoryDelete-52798815': true,
'MultiStoryDelete-6094590': true,
'MultiStoryDelete-79245431': true,
'MultiStoryDelete-81709313': true,
'CommentDelete-17742905': true,
'CommentDelete-33343171': true,
'CommentDelete-39883878': true,
'CommentDelete-63196281': true,
'CommentDelete-7855453': true,
'CommentDelete-8839544': true,
'CommentUpdate-451557': true,
'MultiStoryMoveFromProject-68551553': true, // move from doesn't, move *into* moves.  the distinction probably doesn't matter.
'MultiStoryMoveFromProject-92863366': true,
};

let dontgetit = {
'MultiStoryMove-43793222': true, // why does it look like it has an effective velocity of 2 instead of the initial velocity of 1?
};

function projectNow(project) {
  return project.updatedAt;
}

function expectNoDiff(name, one, two) {
  let theDiff = diff(one, two);
  if (theDiff) {
    console.log(`failed: ${name}`);
    console.log(JSON.stringify(theDiff));
    console.log('one', one);
    console.log('two', two);
  }
  expect(theDiff).toEqual(undefined);
}
function expectSuperset(name, superset, subset) {
  let theDiff = diff(superset, subset);
  if (theDiff) {
    // console.log(`diff: ${name}`);
    // console.log(JSON.stringify(theDiff));
  }
  expect(superset).toEqual(jasmine.objectContaining(subset));
}

function activePeople(project) {
  return project.memberships
    .filter(m => m.id)
    .map(m => project.people[m.person_id]);
}

var reducer = require('../dist/bundle').reducer;
var pointScale = require('../dist/bundle').pointScale;
var estimateBugsAndChores = require('../dist/bundle').estimateBugsAndChores;
var iterations = require('../dist/bundle').iterations;
var storyIds = require('../dist/bundle').storyIds;
var stories = require('../dist/bundle').stories;
var shownIterationsStartTime = require('../dist/bundle').shownIterationsStartTime;
var velocity = require('../dist/bundle').velocity;
var panic = require('../dist/bundle').panic;
const fs = require('fs');

function readFixture(key, snapshot) {
  let data = tryRead(key, snapshot + '.json');
  return data && JSON.parse(data);
}

function tryRead(key, fixtureFile) {
  let path = __dirname + '/fixtures/' + key + '/' + fixtureFile;
  try {
    return fs.readFileSync(path, {encoding: 'utf8'});
  } catch(e) {}
}

function iterationsFromSnapshot(snapshot, iterationsSnapshot, now) {
  function convert(timestamp) {
    return new tz.Date(timestamp, snapshot.timezone.olson_name).getTime();
  }
  let iters = iterationsSnapshot.map(iter => ({number: iter.number, start: convert(iter.start), finish: convert(iter.finish), storyIds: iter.story_ids}));
  let numberOfBacklogIterations = iters.filter(iter => iter.finish >= now).length;
  return iters.slice().reverse().slice(0, snapshot.doneIterationsToShow + numberOfBacklogIterations).reverse();
}

function formattedReducedIterations(reduction) {
  let iters = iterations(reduction);
  let numberOfBacklogIterations = iters.filter(iter => iter.type !== 'done').length;
  let formattedIters = iters.map(iter => ({number: iter.number, finish: iter.finish, start: iter.start, storyIds: iter.storyIds}));
  return formattedIters.slice().reverse().slice(0, reduction.doneIterationsToShow + numberOfBacklogIterations).reverse();
}

describe('Project Command Processing', function() {
  fs.readdirSync(__dirname + '/fixtures').slice(0).forEach(function(key) {
    // if (!key.match(/MultiStoryMoveFromProject/)) { return }
    it('creates a patch for ' + key, function() {
      var before  = readFixture(key, 'before');
      var after   = readFixture(key, 'after');
      var afterIterations   = readFixture(key, 'iteration-after');
      var timestamp   = tryRead(key, 'timestamp.txt');
      var command = readFixture(key, 'command').stale_commands[0];
      let beforeState = reducer(undefined, {type: 'RESET_PROJECT', project: before});
      let afterState = reducer(undefined, {type: 'RESET_PROJECT', project: after});

      let now = timestamp ? new Date(timestamp).getTime() : projectNow(afterState);
      beforeState = reducer(beforeState, {type: 'TICK', time: now});
      afterState = reducer(afterState, {type: 'TICK', time: now});

      let reduction = reducer(beforeState, {type: 'RECEIVE_COMMAND', command});

      if (dontgetit[key]) {
        console.log('i dont get it: ' + key);
      } else if (panicCases[key]) {
        expect(panic(reduction)).toEqual(true);
      } else if (buggyPlatform[key]) {
        console.log('buggy platform, check out fixture in ' + key);
      } else {
        expectNoDiff('pointScale', pointScale(reduction), pointScale(afterState));
        expectNoDiff('estimateBugsAndChores', estimateBugsAndChores(reduction), estimateBugsAndChores(afterState));
        expectNoDiff('storyIds', storyIds(reduction), storyIds(afterState));
        expectNoDiff('stories', stories(reduction), stories(afterState));
        expectNoDiff('timezone', reduction.timezone, afterState.timezone);
        expectNoDiff('epicIds', reduction.epicIds, afterState.epicIds);
        expectNoDiff('epics', reduction.epics, afterState.epics);
        expectNoDiff('labels', reduction.labels, afterState.labels);
        expectSuperset('tasks', reduction.tasks, afterState.tasks);
        expectSuperset('comments', reduction.comments, afterState.comments);
        expectSuperset('fileAttachments', reduction.fileAttachments, afterState.fileAttachments);
        expectSuperset('googleAttachments', reduction.googleAttachments, afterState.googleAttachments);
        // expectSuperset('memberships', reduction.memberships, afterState.memberships);
        // expectSuperset('people', reduction.people, afterState.people);
        expectSuperset('active memberships', reduction.memberships.filter(m => m.id), afterState.memberships.filter(m => m.id));
        expectSuperset('active people', activePeople(reduction), activePeople(afterState));
        expectNoDiff('startTime', reduction.startTime, afterState.startTime);
        expectNoDiff('shownIterationsStartTime', shownIterationsStartTime(reduction), shownIterationsStartTime(afterState));
        expectNoDiff('iterationLength', reduction.iterationLength, afterState.iterationLength);
        expectNoDiff('iterationOverrides', reduction.iterationOverrides, afterState.iterationOverrides);
        // console.log(reduction.startTime)
        // console.log(afterState.startTime)
        if (afterIterations) {
          // console.log('reduction.iterationOverrides', reduction.iterationOverrides);
          // console.log('afterState.iterationOverrides', afterState.iterationOverrides);
          // console.log('doneIterations(reduction)', doneIterations(reduction));
          // console.log('iterationsFromSnapshot(afterState, afterIterations)', iterationsFromSnapshot(afterState, afterIterations));
          // console.log('velocity(reduction)', velocity(reduction));
          // // console.log('formattedReducedIterations(reduction)', formattedReducedIterations(reduction));
          // console.log('iterations(reduction)', iterations(reduction));
          // console.log('iterationsFromSnapshot(afterState, afterIterations', iterationsFromSnapshot(afterState, afterIterations));
            // console.log('reduction', reduction);
          expectNoDiff('iterations', formattedReducedIterations(reduction), iterationsFromSnapshot(afterState, afterIterations, now));
        }
      }
    });
  });
});
