var tz = require('timezone-js');

tz.timezone.transport = function() {
  var data = require('./timezones.json');

  return JSON.stringify(data);
};
tz.timezone.loadingScheme = tz.timezone.loadingSchemes.MANUAL_LOAD;
tz.timezone.loadZoneJSONData('tz', true);

module.exports = tz;
