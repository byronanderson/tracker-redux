"use strict";

const tz = require('../lib/TimezoneJS');
const bundle = require('../dist/bundle');
const reducer = bundle.reducer;
const iterations = bundle.iterations;
const storyIds = bundle.storyIds;
const stories = bundle.stories;

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
      "ede": "America/Los_Angeles",
      "offset": "-07:00"
    },
    "velocity_averaged_over": 4,
    "number_of_done_iterations_to_show": 12,
    "has_google_domain": true,
    "initial_velocity": 10,
    "public": false,
    "project_type": "private",
    "start_time": new tz.Date(2016, 5, 10, "America/Los_Angeles").getTime(),
    "shown_iterations_start_time": new tz.Date(2016, 5, 10, "America/Los_Angeles").getTime(),
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

let nameAddendum = 0;

function makeStory(details) {
  nameAddendum++;
  return Object.assign({
    "created_at": 1468324800000,
    "updated_at": 1468324800000,
    "estimate": 2,
    "story_type": "feature",
    "name": "The Save Dialog " + nameAddendum,
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

describe('Loading past done stories into state', function() {
  const timezone = 'America/Los_Angeles';
  const currentTime = new tz.Date(2016, 6, 12, 12, timezone);
  const startOfCurrentDate = new tz.Date(2016, 6, 12, timezone);

  it('works', function() {
    let existingStory = makeStory({
      id: 2,
      current_state: 'accepted',
      accepted_at: addDays(currentTime, -5).getTime()
    });

    let project = makeProject({
      stories: [existingStory],
    });

    let newlyLoadedStory = makeStory({
      id: 1,
      current_state: 'accepted',
      accepted_at: addDays(currentTime, -10).getTime()
    });

    let reduction = reducer(formatProject(project), {type: 'LOAD_PAST_DONE_STORIES', stories: [newlyLoadedStory]});

    expect(storyIds(reduction)).toEqual([1, 2]);
    expect(stories(reduction).map(s => s.name)).toEqual([
      newlyLoadedStory.name,
      existingStory.name
    ]);
  });
});