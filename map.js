'use strict';

<<<<<<< HEAD
var fs = require('fs');
var ff = require('feature-filter');
var featureCollection = require('turf-featurecollection');
var turfLength = require('@turf/length');
=======
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
const splitFeatures = (geojsonFeatureIntersectingWithTile, tile, features) => {
  const tilePolygon = tilebelt.tileToGeoJSON(tile);
  if (geojsonFeatureIntersectingWithTile.geometry.type === 'Polygon' &&
  turf.booleanWithin(tilePolygon, geojsonFeatureIntersectingWithTile)) {
    const result = turf.helpers.featureCollection(features);
    return result;
  } else {
    const result = turf.helpers.featureCollection([]);
    features.forEach((mbtileFeature) => {
      errorFeature = JSON.stringify(mbtileFeature);
      getPolygons(geojsonFeatureIntersectingWithTile).features.forEach((geojsonFeaturePolygon) => {
        switch((mbtileFeature.geometry.type)) {
          case 'LineString':
            if (turf.booleanWithin(mbtileFeature, geojsonFeaturePolygon)) {
              result.features.push(mbtileFeature);
            } else {
              let split = turfLineSplit(mbtileFeature, geojsonFeaturePolygon);
              let multiLineStringCoordinates = [];
              let firstSplitLineIsOutside;
              if(turf.booleanPointInPolygon(turf.helpers.point(mbtileFeature.geometry.coordinates[0]), geojsonFeaturePolygon)){
                firstSplitLineIsOutside = 0;
              } else {
                firstSplitLineIsOutside = 1;
              }
              split.features.forEach((splitPart, i) => {
                //Depending on whether the first split part is outside, add all alternate parts to the final result
                if((i + firstSplitLineIsOutside)%2 === 0) {
                  multiLineStringCoordinates.push(splitPart.geometry.coordinates);
                }
              });
              if (multiLineStringCoordinates.length) {
                result.features.push(turf.helpers.multiLineString(
                  multiLineStringCoordinates,
                  mbtileFeature.properties
                ));
              }
            }
          break;
          case 'Point':
            if (turf.booleanPointInPolygon(mbtileFeature, geojsonFeaturePolygon)) {
              result.features.push(mbtileFeature);
            }
          break;
          case 'MultiPoint':
            const multiPointCoordinates = [];
            mbtileFeature.geometry.coordinates.forEach((coordinate) => {
              if (turf.booleanPointInPolygon(turf.helpers.point(coordinate), geojsonFeaturePolygon)) {
                multiPointCoordinates.push(coordinate)
              }
            });
            if (multiPointCoordinates.length) {
              result.features.push(turf.helpers.multiPoint(
                multiPointCoordinates,
                mbtileFeature.properties
              ));
            }
          break;
          case 'MultiLineString':
            const multiLineStringCoordinates = [];
            mbtileFeature.geometry.coordinates.forEach(lineCoordinates => {
              if ((turf.booleanWithin(turf.helpers.lineString(lineCoordinates), geojsonFeaturePolygon))) {
                multiLineStringCoordinates.push(lineCoordinates);
              } else {
                //split each line string in the multilinestring
                let split = turfLineSplit(turf.helpers.lineString(lineCoordinates), geojsonFeaturePolygon);
                let firstSplitLineIsOutside;
                //check if first point in mbtilesFeature is in polygon. If yes, 0
                if(turf.booleanPointInPolygon(turf.helpers.point(lineCoordinates[0]), geojsonFeaturePolygon)){
                  firstSplitLineIsOutside = 0;
                } else {
                  firstSplitLineIsOutside = 1;
                }
                // Depending on whether first point is in, every alternate
                // split is inside the polygon
                split.features.forEach((splitPart, i) => {
                  if((i + firstSplitLineIsOutside)%2 === 0) {
                    multiLineStringCoordinates.push(splitPart.geometry.coordinates);
                  }
                });
              }
            });
            if (multiLineStringCoordinates.length) {
              result.features.push(turf.helpers.multiLineString(
                multiLineStringCoordinates,
                mbtileFeature.properties
              ));
            }
          break;
          case 'Polygon':
          case 'MultiPolygon':
            let intersection;
            try {
               intersection = polygonClipping.intersection(geojsonFeaturePolygon.geometry.coordinates,
                mbtileFeature.geometry.coordinates);
              } catch (e) {
                try {
                  intersection = polygonClipping.intersection(mbtileFeature.geometry.coordinates, geojsonFeaturePolygon.geometry.coordinates);
                } catch (e) {
                    throw e;
                }
              }
              if (intersection) {
                result.features.push(turf.helpers.multiPolygon(
                  intersection,
                  mbtileFeature.properties));
              }
          break;
        };
      });
    });
    return result;
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
>>>>>>> latest ucb
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
        const splitFeaturesFinalList = splitFeatures(countyFeature, tile, result);
        // console.log(JSON.stringify(splitFeaturesFinalList));
        callbackResult[filter.split('../feature-filters/')[1]] = splitFeaturesFinalList;
    });
    done(null, callbackResult);
};
