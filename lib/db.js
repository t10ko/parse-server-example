'use strict';

module.exports = {
    configure,
    find
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

    //  Pointer type field names.
    //  This is needed for resolving pointers.
    //  Trying to get from configuration, if not given through options object, 
    const pointers = options.pointers || config.pointers || [];

    //  Actually a `where field=value` type filters.
    //  Can be multiple value ones and will be combined with `or`.
    const filters = options.filters || {};

    //  This will parse pointers on go.
    //  No need to resolve pointer type.
    pointers.forEach((field) => {
        query.include(field);
    });

    //  Adding filters to this request.
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

        //  This is needed for pointer type objects.
        //  Parse sometimes sends values which need to be converted to regular objects, 
        //  cuz it gives weird JSON when stringifying it. 
        .then(fixResults)

        //  Resolving relations and returning the ready to use object!
        .then((results) => {
            return resolveRelations(results, classname);
        });
}

function getConfig(classname) {
    const config = classesConfig[classname] || {};

    //  Configuration for a particular class(a table) consists only with this options.
    //  Relations are one-to-many relation fields, which need to be Array typed.
    //  Pointers are one-to-one relation fields, which are Pointer typed.
    //  
    //  Both give only field list, so when empty, fallback to empty array.
    ['relations', 'pointers'].forEach((name) => {
        config[name] = config[name] || [];
    });

    return config;
}

function resolveRelations(results, classname) {

    //  Getting one-to-many and one-to-one relation field 
    //  names for this particular classname(a database's table's name).
    const config = getConfig(classname);

    //  Those are one-to-many fields.
    const refFields = config.relations;

    //  This maps class name to ID values.
    //  Here we keep all relations which we need to parse from database 
    //  and fill into original object to get a ready-to-use result.
    let classToValues = {};

    //  Here we keep field names which we actually parsed, 
    //  and we need to replace them with parsed objects.
    let fieldsFound = [];

    //  Promises container to combine all requests into one.
    let promises = [];

    //  Iterating throught one-to-many reference fields and trying to find them.
    //  When found, we need to request the actual rows from database.
    refFields.forEach((field) => {

        //  Table's name is the same field's name only capitalized.
        //  This means if we have field tags, then it points to class Tags(a database's table)
        const classname = capitalize(field);

        //  True if we found this field in given rows.
        let found = false;

        //  This object is for deleting duplicates when getting dependencies.
        //  Cuz we're getting dependencies for all rows, there might be repeated values,
        //  (many items can have the same tag for example).
        let uniqueIds = {};

        //  Those are the rows that we got from database.
        //  Iterating through them to find values of this one-to-many relation.
        results.every((item) => {

            //  The value of one-to-many relation field.
            const relatedIds = item[field];

            if (relatedIds) {

                //  We found this field!
                found = true;

                //  Need to save id's which are in here.
                //  One-to-many relations MUST be Array typed.
                relatedIds.forEach((id) => {
                    uniqueIds[id] = 1;
                });
            }

            //  If we couldn't find relation, we need to return immediately, 
            //  cuz it will not be found in other rows as well, 
            //  cuz we have the same structure for all rows.
            return !!relatedIds;
        });

        //  If we didn't find this field in this table, 
        //  just return and continue to find the other ones.
        if (!found) {
            return;
        }

        //  We keep fields that we found.
        fieldsFound.push(field);

        //  Resolving dependencies for this particular field of a class!
        //  Saving given promise in promises container to 
        //  combine those requests into one for easier preparation process.
        promises.push(find(classname, {
            filters: {
                objectId: Object.keys(uniqueIds)
            }
        }));
    });

    //  We have no dependencies to parse if there are no promises to wait for results from remote.
    //  So just return given results, no need to prepare them. :)
    if (!promises.length) {
        return Promise.resolve(results);
    }

    return Promise.all(promises)
        .then((list) => {

            //  This should map one-to-many relation field's 
            //  name to the actual values which we got from db.
            let fieldToValues = {};

            //  Preparing fieldToValues.
            list.forEach((subResults, index) => {
                const field = fieldsFound[index];

                //  This maps from objectId to the real row.
                let objectIdToItem = {};

                //  Preparing objectIdToItem.
                subResults.forEach((result) => {
                    objectIdToItem[result.objectId] = result;
                });

                //  Finally saving mapping into fieldToValues.
                fieldToValues[field] = objectIdToItem;
            });

            //  This is the final step for preparing the original 
            //  results object and replace all one-to-many relation 
            //  pointer values with the real items from that tables.
            results.forEach((item) => {
                for (const field in fieldToValues) {
                    const subResults = fieldToValues[field];
                    const relatedIds = item[field];

                    //  This replaces the pointer with the actual item.
                    relatedIds.forEach((id, key) => {
                        relatedIds[key] = subResults[id];
                    });
                }
            });

            return results;
        });
}