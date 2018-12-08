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
          polygons.features.push(turf.helpers.feature({
            type: "Polygon",
            coordinates
          }, feature.properties));
        });
        return polygons;
    }
};
const splitFeatures = (geojson, tile, features) => {
    const tilePolygon = tilebelt.tileToGeoJSON(tile);
    const tileGeojsonGeometryIntersection = polygonClipping.intersection(geojson.geometry.coordinates,
      tilePolygon.coordinates);
    if (!tileGeojsonGeometryIntersection[0][0].length || !tileGeojsonGeometryIntersection[0][0][0].length) return {};
    else {
      const geojsonFeatureIntersectingWithTile = turf.helpers.multiPolygon(tileGeojsonGeometryIntersection);
      geojsonFeatureIntersectingWithTile.properties = geojson.properties;
      const result = {};
      result[geojsonFeatureIntersectingWithTile.properties.GEOID] = {
        Type: 'FeatureCollection',
        features: []
      };
      features.forEach((mbtileFeature) => {
        getPolygons(geojsonFeatureIntersectingWithTile).features.forEach((geojsonFeaturePolygon) => {
          switch((mbtileFeature.geometry.type)) {
            case 'LineString':
              if ((turf.booleanWithin(mbtileFeature, geojsonFeaturePolygon))) {
                result[geojsonFeaturePolygon.properties.GEOID].features =
                result[geojsonFeaturePolygon.properties.GEOID].features.concat(mbtileFeature);
              } else {
                let split = turfLineSplit(mbtileFeature, geojsonFeaturePolygon);
                let oddPair;
                if(turf.booleanPointInPolygon(turf.point(mbtileFeature.geometry.coordinates[0]), geojsonFeaturePolygon)){
                  oddPair = 0;
                } else {
                  oddPair = 1;
                }
                split.features.forEach((splitedPart, i) => {
                  if((i + oddPair)%2 === 0) {
                    result[geojsonFeaturePolygon.properties.GEOID].features =
                    result[geojsonFeaturePolygon.properties.GEOID].features.concat(turf.helpers.feature({
                      type: 'LineString',
                      geometry: splitedPart.geometry,
                      properties: mbtileFeature.properties
                    }));
                  }
                });
              }
            break;
            case 'Point':
              if (turf.booleanPointInPolygon(mbtileFeature, geojsonFeaturePolygon)) {
                result[geojsonFeaturePolygon.properties.GEOID].features.push(mbtileFeature);
              }
            break;
            case 'MultiLineString':
              const lineStrings = turf.lineSegment(mbtileFeature);
              lineStrings.features.forEach((feature) => {
                if ((turf.booleanWithin(feature, geojsonFeaturePolygon))) {
                  feature.properties = mbtileFeature.properties;
                  result[geojsonFeaturePolygon.properties.GEOID].features =
                  result[geojsonFeaturePolygon.properties.GEOID].features.concat(feature);
                }
              });
              mbtileFeature.geometry.coordinates.forEach(part => {
                let split = turfLineSplit(turf.lineString(part), geojsonFeaturePolygon);
                let oddPair;
                if(turf.booleanPointInPolygon(turf.point(part[0]), geojsonFeaturePolygon)){
                  oddPair = 0;
                } else {
                  oddPair = 1;
                }
                split.features.forEach((splitedPart, i) => {
                  if((i + oddPair)%2 === 0) {
                    result[geojsonFeaturePolygon.properties.GEOID].features =
                    result[geojsonFeaturePolygon.properties.GEOID].features.concat(turf.helpers.feature({
                      type: 'LineString',
                      geometry: splitedPart.geometry,
                      properties: mbtileFeature.properties
                    }));
                  }
                });
              });

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
                  result[geojsonFeaturePolygon.properties.GEOID].features =
                  result[geojsonFeaturePolygon.properties.GEOID].features.concat(turf.helpers.feature({
                    type: "MultiPolygon",
                    coordinates: intersection
                  }, mbtileFeature.properties));
                }
            break;
          };
        });
      });
      return result;

    }
};

process.on('uncaughtException', function (err) {
  console.log(err);
  const s3 = new AWS.S3();
  const s3Options = {
    Bucket: 'aruna-information-seeding',
    Key: `errors/map/${process.env.year}-Q${process.env.q}-${process.env.tileset}.json`
  }
  s3.putObject(Object.assign(s3Options, {
    Body: JSON.stringify(err, Object.getOwnPropertyNames(err))
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
        const splitFeaturesFinalList = splitFeatures(countyFeature, tile, result)[countyFeature.properties.GEOID];
        console.log(JSON.stringify(splitFeaturesFinalList));
        callbackResult[filter.split('../feature-filters/')[1]] = splitFeaturesFinalList;
    });
    done(null, callbackResult);
};
