'use strict';

module.exports = {
    configure,
    find,
    prepareRelations
};

let classesConfig = {};
const fixResults = require('./fix-results');

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function configure(config) {
    classesConfig = config;
}

function find(classname, options = {}) {
    const query = new Parse.Query(classname);
    const config = getConfig(classname);

    const pointers = options.pointers || config.pointers || [];
    const filters = options.filters || {};

    //  This will parse subtitle pointer on go.
    pointers.forEach((field) => {
        query.include(field);
    });

    //  Filtering this request.
    for (const field in filters) {
        const value = filters[field];
        if (Array.isArray(value)) {
            query.containedIn(field, value);
        } else {
            query.equalTo(field, value);
        }
    }

    //  Executing the query.
    return query.find()
        .then(fixResults)
        .then((results) => {
            return prepareRelations(results, classname);
        });
}

function getConfig(classname) {
    const config = classesConfig[classname] || {};

    ['relations', 'pointers'].forEach((name) => {
        config[name] = config[name] || [];
    });

    return config;
}

function prepareRelations(results, classname) {
    const config = getConfig(classname);
    const refFields = config.relations;

    //  If all ref fields are resolved, return promise immediately.
    //  If not, need to continue resolving process.
    let classToValues = {};

    //  Fields that has been found and fields that are not found yet.
    let fieldsParsed = [];

    //  Promises for requests.
    let promises = [];

    refFields.forEach((field) => {
        const classname = capitalize(field);

        let parsed = false;
        let uniqueIds = {};

        //  Iterating throught results.
        results.every((item) => {
            const relatedIds = item[field];

            //  If we found an actual relation for this field, we 
            //  should mark this as a parsed one and remove it from refFields.
            if (relatedIds) {
                parsed = true;

                //  Saving ids for this paticular result.
                relatedIds.forEach((id) => {
                    uniqueIds[id] = 1;
                });
            }

            //  If we couldn't find relation, we need to return immediately from searching for this field in results.
            return !!relatedIds;
        });

        //  Prepare ids for fields which have been parsed.
        if (parsed) {

            //  This is container for parsed fields.
            fieldsParsed.push(field);

            //  Saving this reuqest in promises 
            //  container to combine those to one.
            promises.push(find(classname, {
                filters: {
                    objectId: Object.keys(uniqueIds)
                }
            }));
        }
    });

    //  If there are no promises to wait for results from remote, just returned given results.
    if (!promises.length) {
        return Promise.resolve(results);
    }

    return Promise.all(promises)
        .then((list) => {
            let preparedList = {};

            //  Preparing subresults to create objectId to object relation.
            list.forEach((subResults, index) => {
                const field = fieldsParsed[index];
                let prepared = {};

                subResults.forEach((result) => {
                    const objectId = result.objectId;

                    //  Saving mapping from object ids to results.
                    prepared[objectId] = result;
                });

                preparedList[field] = prepared;
            });

            //  Settings values for all results.
            results.forEach((item) => {

                //  Replaced the first level.
                for (const field in preparedList) {
                    const subResults = preparedList[field];
                    const relatedIds = item[field];

                    relatedIds.forEach((id, key) => {
                        relatedIds[key] = subResults[id];
                    });
                }
            });

            return results;
        });
}