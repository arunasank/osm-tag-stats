#!/usr/bin/env node
'use strict';
const help = require('./util/help.js');
const tileReduce = require('@mapbox/tile-reduce');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const turf = require('@turf/turf');
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
    resultJSON = {};

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
    maxWorkers: maxWorkers,
    tiles: tiles,
    mapOptions: { count, tmpGeojson, dates, users, tagFilter, mbtilesPath }
})
.on('start', function () {
})
.on('reduce', function (results) {
    Object.keys(results).forEach((key) => {
        switch (key) {
        case 'filter1.json':
            resultJSON['filter1.json'] = results[key].features.reduce((final, feature) => {
              if (!feature) return final;
              if (feature.properties['@version'] < 5) {
                if (!final[`@version${feature.properties['@version']}`]) {
                    final[`@version${feature.properties['@version']}`] = {};
                }
                if (!final[`@version${feature.properties['@version']}`][feature.properties.highway]) {
                    final[`@version${feature.properties['@version']}`][feature.properties.highway] = {
                        count: 1,
                        length: turf.length(feature)
                    };
                }
                if (final[`@version${feature.properties['@version']}`] && final[`@version${feature.properties['@version']}`][feature.properties.highway]) {
                    final[`@version${feature.properties['@version']}`][feature.properties.highway].count++;
                    final[`@version${feature.properties['@version']}`][feature.properties.highway].length += turf.length(feature);
                }
              } else {
                if (!final[`@version5Plus`]) {
                    final[`@version5Plus`] = {};
                }
                if (!final[`@version5Plus`][feature.properties.highway]) {
                    final[`@version5Plus`][feature.properties.highway] = {
                        count: 1,
                        length: turf.length(feature)
                    };
                } else {
                    final[`@version5Plus`][feature.properties.highway].count++;
                    final[`@version5Plus`][feature.properties.highway].length += turf.length(feature);
                }
              }
                return final;
            }, resultJSON['filter1.json'] ? resultJSON['filter1.json'] : {});
            break;
        case 'filter2.json':
            resultJSON['filter2.json'] = results[key].features.reduce((final, feature) => {
                if (!feature) return final;
                if (!final[feature.properties.highway]) {
                    final[feature.properties.highway] = {
                        count: 1,
                        length: turf.length(feature)
                    };
                } else {
                    final[feature.properties.highway].count++;
                    final[feature.properties.highway].length += turf.length(feature);
                }
                return final;
            }, resultJSON['filter2.json'] ? resultJSON['filter2.json'] : {});
            break;
        case 'filter3.json':
            resultJSON['filter3.json'] = results[key].features.reduce((final, feature) => {
                if (!feature) return final;
                if (!final[feature.properties.highway]) {
                    final[feature.properties.highway] = {
                        count: 1,
                        length: turf.length(feature)
                    };
                } else {
                    final[feature.properties.highway].count++;
                    final[feature.properties.highway].length += turf.length(feature);
                }
                return final;
            }, resultJSON['filter3.json'] ? resultJSON['filter3.json'] : {});
            break;
        case 'filter4.json':
            resultJSON['filter4.json'] = results[key].features.reduce((final, feature) => {
                if (!feature) return final;
                if (!final[feature.properties.highway]) {
                    final[feature.properties.highway] = {
                        count: 1,
                        length: turf.length(feature)
                    };
                } else {
                    final[feature.properties.highway].count++;
                    final[feature.properties.highway].length += turf.length(feature);
                }
                return final;
            }, resultJSON['filter4.json'] ? resultJSON['filter4.json'] : {});
            break;
        case 'filter5.json':
            resultJSON['filter5.json'] = results[key].features.reduce((final, feature) => {
                if (!feature) return final;
                if (!final[feature.properties.amenity]) {
                    final[feature.properties.amenity] = {
                        count: 1
                    };
                } else {
                    final[feature.properties.amenity].count++;
                }
                return final;
            }, resultJSON['filter5.json'] ? resultJSON['filter5.json'] : {});
            break;
        case 'filter6.json':
            resultJSON['filter6.json'] = results[key].features.reduce((final, feature) => {
                if (!feature) return final;
                if (!final[feature.properties.building]) {
                    final[feature.properties.building] = {
                        count: 1
                    };
                } else {
                    final[feature.properties.building].count++
                }
                return final;
            }, resultJSON['filter6.json'] ? resultJSON['filter6.json'] : {});
            break;
        case 'filter7.json':
            resultJSON['filter7.json'] = results[key].features.reduce((final, feature) => {
                if (!feature) return final;
                if (feature.properties['@version'] < 5) {
                  if (!final[`@version${feature.properties['@version']}`]) {
                      final[`@version${feature.properties['@version']}`] = {
                          count: 1
                      };
                  } else {
                      final[`@version${feature.properties['@version']}`].count++;
                  }
                }
                else {
                  if (!final[`@version5Plus`]) {
                      final[`@version5Plus`] = {
                        count: 1
                      };
                  } else {
                      final[`@version5Plus`].count++;
                  }
                }
                return final;
            }, resultJSON['filter7.json'] ? resultJSON['filter7.json'] : {});
            break;
        }
    });
})
.on('end', function () {
    const s3 = new AWS.S3();
    Object.keys(resultJSON).forEach((key) => {
      const s3Options = {
        Bucket: 'aruna-information-seeding',
        Key: `processed/${process.env.year}-Q${process.env.q}/json/${key}/${process.env.tileset}.json`
      }
      s3.putObject(Object.assign(s3Options, {
        Body: JSON.stringify(resultJSON[key])
      }))
      .promise()
      .then(() => console.log(`Wrote file to s3://aruna-information-seeding/processed/${process.env.year}-Q${process.env.q}/json/${key}/${process.env.tileset}.json`))
      .catch((err) => {
        throw err
      });
    });
});

process.on('uncaughtException', function (err) {
  console.log(err);
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
>>>>>>> latest ucb
});
