'use strict';

const fs = require('fs');
const ff = require('feature-filter');
const turf = require('turf');
const polygonClipping = require('martinez-polygon-clipping');
const turfLineSplit = require('@turf/line-split');
const tilebelt = require('@mapbox/tilebelt');
const whichPolygon = require('which-polygon');
const countyFile = require('../counties.tiger2017.json');
let errorFeature;
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

let callback;

const getPolygons = (feature) => {
    switch(feature.geometry.type) {
      case 'Polygon':
        return turf.helpers.featureCollection([feature]);
      case 'MultiPolygon':
        const polygons = turf.helpers.featureCollection([]);
        feature.geometry.coordinates.forEach((coordinates) => {
          polygons.features.push(turf.helpers.polygon(
            coordinates,
            feature.properties));
        });
        return polygons;
    }
};

process.on('uncaughtException', function (err) {
  const s3 = new AWS.S3();
  const s3Options = {
    Bucket: 'aruna-information-seeding',
    Key: `errors/map/${process.env.year}-Q${process.env.q}/${process.env.tileset}.json`
  }
  s3.putObject(Object.assign(s3Options, {
    Body: `${JSON.stringify(err, Object.getOwnPropertyNames(err))}\n${errorFeature}`
  }))
  .promise()
  .catch((err) => {
    console.log(err);
  });
  callback();
});
/**
 * Filters the OSM features in a single tile based on given filter.
 * @module
 * @type {number}
 */
module.exports = function (data, tile, writeData, done) {
    callback = done;
    const countyFeatureId = /\d+\.mbtiles/.exec(mapOptions.mbtilesPath)[0].split('.mbtiles')[0];
    const countyFeature = countyFile.features.filter((feature) => feature.properties.GEOID === countyFeatureId)[0];
    const callbackResult = {};
    mapOptions.tagFilter.split(',').forEach((filter) => {
        const featureFilter = ff(JSON.parse(fs.readFileSync(`${__dirname}/${filter}`)));
        var layer = data.osm.osm;
        var osmID = (mapOptions.count) ? [] : null;
        var dates = Boolean(mapOptions.dates) ? parseDates(mapOptions.dates) : false;
        var users = mapOptions.users;

        var result = layer.features.filter(function (val) {
            if ((!users || (users && users.indexOf(val.properties['@user']) > -1)) && (
                !mapOptions.dates || (mapOptions.dates && val.properties['@timestamp'] && val.properties['@timestamp'] >= dates[0] && val.properties['@timestamp'] <= dates[1])) && (!featureFilter || (featureFilter && featureFilter(val)))) {
                return true;
            }
        });
        callbackResult[filter.split('../feature-filters/')[1]] = result;
    });

    done(null, callbackResult);
};
