"use strict";

const tz = require('../lib/TimezoneJS');
const bundle = require('../dist/bundle');
const reducer = bundle.reducer;
const iterations = bundle.iterations;

function addDays(date, numDays) {
  return new tz.Date(date.getFullYear(), date.getMonth(), date.getDate() + numDays, date.timezone);
}

function makeProject(details) {
  return Object.assign({
    "id": 1,
    "name": "Microsoft Excel",
    "version": 8,
    "iteration_length": 1,
    "week_start_day": "Monday",
    "point_scale": "0,1,2,3",
    "point_scale_is_custom": false,
    "bugs_and_chores_are_estimatable": false,
    "automatic_planning": true,
    "enable_tasks": true,
    "time_zone": {
      "kind": "time_zone",
      "olson_name": "America/Los_Angeles",
      "offset": "-07:00"
    },
    "velocity_averaged_over": 4,
    "number_of_done_iterations_to_show": 12,
    "has_google_domain": true,
    "initial_velocity": 10,
    "public": false,
    "project_type": "private",
    "start_time": 1468825200000,
    "shown_iterations_start_time": 1468825200000,
    "created_at": 1468843200000,
    "updated_at": 1468929600000,
    "stories": [],
    "epics": [],
    "labels": [],
    "integrations": [],
    "iteration_overrides": [],
    "inactive_memberships": [],
    "account": {
      "kind": "account_summary",
      "id": 1001,
      "name": "Rob's Unlimited",
      "status": "active"
    },
    "current_iteration_number": 1,
    "enable_following": true,
  }, details);
}

function makeStory(details) {
  return Object.assign({
    "created_at": 1468324800000,
    "updated_at": 1468324800000,
    "estimate": 2,
    "story_type": "feature",
    "name": "The Save Dialog",
    "description": "Windoze Save Dialog thingy",
    "current_state": "unstarted",
    "requested_by_id": 3,
    "owner_ids": [],
    "label_ids": [],
    "tasks": [],
    "follower_ids": [],
    "comments": [],
  }, details);
}

function formatProject(project) {
  return reducer(undefined, {type: 'RESET_PROJECT', project});
}

describe('iteration calculation', function() {
  const timezone = 'America/Los_Angeles';
  const currentTime = new tz.Date(2016, 6, 12, 12, timezone);
  const startOfCurrentDate = new tz.Date(2016, 6, 12, timezone);

  it('works', function() {
    let project = makeProject({
      start_time: addDays(currentTime, -9).getTime(),
      stories: [
        makeStory({
          id: 1,
          current_state: 'accepted',
          accepted_at: addDays(currentTime, -5).getTime()
        }),
      ],
      time_zone: {olson_name: timezone},
      iterationLength: 1,
      initialVelocity: 3,
    });

    expect(iterations(formatProject(project), currentTime.getTime())).toEqual([
      {
        number: 1,
        type: 'done',
        start: addDays(startOfCurrentDate, -9).getTime(),
        finish: addDays(startOfCurrentDate, -2).getTime(),
        storyIds: [1]
      },
      {
        number: 2,
        type: 'current',
        start: addDays(startOfCurrentDate, -2).getTime(),
        finish: addDays(startOfCurrentDate, 5).getTime(),
        storyIds: []
      }
    ]);
  });

  it('works with initial velocity', function() {
    let project = makeProject({
      start_time: addDays(currentTime, -9).getTime(),
      stories: [
        makeStory({
          id: 1,
          current_state: 'unstarted',
          estimate: 10,
        }),
        makeStory({
          id: 2,
          current_state: 'unstarted',
          estimate: 10,
        }),
      ],
      time_zone: {olson_name: timezone},
      iteration_length: 1,
      initial_velocity: 7,
    });

    expect(iterations(formatProject(project), currentTime.getTime())).toEqual([
      {
        number: 1,
        type: 'done',
        start: addDays(startOfCurrentDate, -9).getTime(),
        finish: addDays(startOfCurrentDate, -2).getTime(),
        storyIds: []
      },
      {
        number: 2,
        type: 'current',
        start: addDays(startOfCurrentDate, -2).getTime(),
        finish: addDays(startOfCurrentDate, 5).getTime(),
        storyIds: []
      },
      {
        number: 3,
        type: 'backlog',
        start: addDays(startOfCurrentDate, 5).getTime(),
        finish: addDays(startOfCurrentDate, 12).getTime(),
        storyIds: [1]
      },
      {
        number: 4,
        type: 'backlog',
        start: addDays(startOfCurrentDate, 12).getTime(),
        finish: addDays(startOfCurrentDate, 19).getTime(),
        storyIds: [2]
      }
    ]);
  });

  it('works with overridden velocity', function() {

  });
});