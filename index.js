#!/usr/bin/env node
'use strict';

var help = require('./util/help.js');
var tileReduce = require('tile-reduce');
var path = require('path');
var argv = require('minimist')(process.argv.slice(2));
var gsm = require('geojson-stream-merge');
var fs = require('fs');

var tmpDir = 'tmp-osm-tag-stats/';
var cleanArguments = require('./util/cleanArguments')(argv, tmpDir);

var count = cleanArguments.argv.count,
    geojson = cleanArguments.argv.geojson,
    users = cleanArguments.argv.users,
    dates = cleanArguments.argv.dates,
    mbtilesPath = cleanArguments.argv.mbtiles,
    tmpGeojson = cleanArguments.tmpGeojson,
    tagFilter = cleanArguments.argv.filter,
    bbox = cleanArguments.argv.bbox,
    maxWorkers = cleanArguments.argv.maxWorkers,
    tiles = cleanArguments.argv.tiles,
    result = {},
    tmpFd;

if ((!geojson && !count) || !mbtilesPath || argv.help) {
    help();
}

/**
 A tile reduce script to filter OSM features and export them to GeoJSON.
 */
tileReduce({
    zoom: 12,
    map: path.join(__dirname, 'map.js'),
    sources: [{name: 'osm', mbtiles: mbtilesPath}],
    maxWorkers: maxWorkers,
    bbox: bbox,
    tiles: tiles,
    mapOptions: {
        'count': count,
        'tmpGeojson': tmpGeojson,
        'dates': dates,
        'users': users,
        'tagFilter': tagFilter
    }
})
.on('reduce', function (id) {
  if (id) {
    Object.keys(id).forEach(val => {
      if (result[val]) {
        result[val].count += id[val].count;
        result[val].length += id[val].length;
      } else {
        result[val] = {};
        result[val].count = id[val].count;
        result[val].length = id[val].length;
      }
    })
  }
})
.on('end', function () {
  fs.writeFileSync(`${mbtilesPath}.geojson`, JSON.stringify(result)); 
});
