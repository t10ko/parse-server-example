'use strict';

const db = require('../lib/db');

db.configure({
    Home: {
        pointers: ['subtitle']
    },
    Food: {
        relations: ['tags', 'restaurants'],
        pointers: ['subtitle']
    },
    Restaurants: {
        relations: ['places']
    },
    Tags: {
        pointers: ['color']
    },
    Map: {
        pointers: ['place']
    },
    Music: {
        relations: ['tags'],
        pointers: ['subtitle']
    },
    Phrases: {
        relations: ['tags'],
        pointers: ['subtitle']
    },
    Stories: {
        relations: ['tags'],
        pointers: ['place', 'subtitle']
    },
});

function getMap(keys, values) {
    let result = {};

    keys.forEach((key) => {
        result[key] = values[key];
    });

    return result;
}

Parse.Cloud.define('HomePage', (request, response) => {
    const fieldsToOverride = ['subtitle'];

    //  Executing the query.
    db.find('Home')
        .then((results) => {
            let promises = [];

            let tableToObjectIds = {};
            let valuesToOverride = {};

            //  Preparing results.
            results.forEach((item) => {
                const refObjectId = item.refObjectId;
                const info = refObjectId.split(':');

                if (info.length != 2) {
                    return;
                }

                const table = info[0];
                const objectId = info[1];

                //  Creating container for items for a particular table.
                if (!tableToObjectIds[table]) {
                    tableToObjectIds[table] = [];
                }

                //  Saving the needed item id.
                tableToObjectIds[table].push(objectId);

                //  Keeping custom information of Home class to override fields 
                //  which come from different tables but are specified here as well.
                valuesToOverride[refObjectId] = getMap(fieldsToOverride, item);
            });

            //  Getting original items.
            for (const table in tableToObjectIds) {
                const request = db.find(table, {
                    filters: {
                        objectId: tableToObjectIds[table]
                    }
                });

                //  Preparing results from gotten from given table.
                request.then((subResults) => {
                    return subResults.map((item) => {
                        const refObjectId = table + ':' + item.objectId;
                        const toOverride = valuesToOverride[refObjectId];

                        if (toOverride) {
                            Object.assign(item, toOverride);
                        }

                        return item;
                    });
                })

                //  Sending the request and saving the promise in promises array.
                promises.push(request);
            }

            return Promise.all(promises);
        })
        .then((allResults) => {

            //  Inlining results.
            let results = [];
            allResults.forEach((subResults) => {
                results.push(...subResults);
            });

            //  Printing results.
            response.success(results);
        })
        .catch((err) => {
            response.error('Couldn\'t get information for home page.', err);
        });
});

['Food', 'Music', 'Stories', 'Phrases', 'Map'].forEach((classname) => {
    Parse.Cloud.define(classname + 'Page', (request, response) => {

        //  Executing the query.
        db.find(classname)
            .then((results) => {
                response.success(results);
            })
            .catch((err) => {
                response.error('Couldn\'t get information for ' + classname.toLowerCase() + ' page.', err);
            });
    });
});