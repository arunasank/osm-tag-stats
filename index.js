#!/usr/bin/env node
'use strict';
const help = require('./util/help.js');
const tileReduce = require('@mapbox/tile-reduce');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const turf = require('turf');
const fs = require('fs');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const tmpDir = 'tmp-osm-tag-stats/';
const cleanArguments = require('./util/cleanArguments')(argv, tmpDir);

const count = cleanArguments.argv.count,
    users = cleanArguments.argv.users,
    dates = cleanArguments.argv.dates,
    mbtilesPath = cleanArguments.argv.mbtiles,
    tmpGeojson = cleanArguments.tmpGeojson,
    tagFilter = cleanArguments.argv.filter,
    maxWorkers = cleanArguments.argv.maxWorkers,
    tiles = cleanArguments.argv.tiles,
    resultJSON = {
      count: 0, length: 0
    };
console.log(tagFilter);
if (!mbtilesPath || argv.help) {
    help();
}

/**
 A tile reduce script to filter OSM features and export them to GeoJSON.
 */
tileReduce({
    zoom: 12,
    map: path.join(__dirname, 'map.js'),
    sources: [{name: 'osm', mbtiles: mbtilesPath}],
    maxWorkers: 4,
    tiles: tiles,
    mapOptions: { count, tmpGeojson, dates, users, tagFilter, mbtilesPath }
})
.on('start', function () {
})
.on('reduce', function (results) {
  results.forEach(feature => {
    resultJSON.count++;
    resultJSON.length+=turf.length(feature);
  });
})
.on('end', function () {
    fs.writeFileSync(`${mbtilesPath}.geojson`, JSON.stringify(resultJSON));
    // const s3 = new AWS.S3();
    // Object.keys(resultJSON).forEach((key) => {
    //   const s3Options = {
    //     Bucket: 'aruna-information-seeding',
    //     Key: `processed/${process.env.year}-Q${process.env.q}/json/${key}/${process.env.tileset}.json`
    //   }
    //   s3.putObject(Object.assign(s3Options, {
    //     Body: JSON.stringify(resultJSON[key])
    //   }))
    //   .promise()
    //   .catch((err) => {
    //     throw err
    //   });
    // });
});

process.on('uncaughtException', function (err) {
  const s3 = new AWS.S3();
  const s3Options = {
    Bucket: 'aruna-information-seeding',
    Key: `errors/index/${process.env.year}-Q${process.env.q}-${process.env.tileset}.json`
  }
  s3.putObject(Object.assign(s3Options, {
    Body: JSON.stringify(err, Object.getOwnPropertyNames(err))
  }))
  .promise()
  .catch((err) => {
    console.log(err);
  });
  process.exit(1);
});
