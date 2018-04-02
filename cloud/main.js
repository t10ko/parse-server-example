Parse.Cloud.define("HomePage", (request, response) => {
    let tableToObjectIds = {};
    let fieldsToOverride = {};

    //  Getting all items from Home class.
    const query = new Parse.Query("Home");

    //  Executing the query.
    query.find()
        .then((results) => {
            let promises = [];

            //  Preparing results.
            results.forEach((item) => {
                const refObjectId = item.get('refObjectId');
                const info = refObjectId.split(':');

                if (info.length != 2) {
                    return;
                }

                const table = info[0];
                const objectId = info[1];

                //  Creating container for items for a particular table.
                let tableItems = tableToObjectIds[table] || (tableToObjectIds[table] = []);

                //  Keeping custom information of Home class to override fields 
                //  which come from different tables but are specified here as well.
                const customFields = Object.assign({}, item.attributes);
                delete customFields.refObjectId;

                //  Saving the needed item id.
                tableItems.push(objectId);
                fieldsToOverride[refObjectId] = customFields;
            });

            //  Getting original items.
            for (const table in tableToObjectIds) {
                const objectIds = tableToObjectIds[table];
                const query = new Parse.Query(table);

                //  Getting only needed items from this table.
                query.containedIn("objectId", objectIds);

                //  Sending the request and saving the promise in promises array.
                promises.push(query.find());
            }

            return Parse.Promise.all(promises);
        })
        .then((realItemsList) => {
            let i = 0;

            //  Overrinding field values of given items with the ones which are in Home class.
            for (const table in tableToObjectIds) {
                const items = realItemsList[i++];

                items.forEach((item) => {
                    const refObjectId = table + ':' + item.get('objectId');
                    const toOverride = fieldsToOverride[refObjectId];

                    if (toOverride) {
                        Object.assign(item.attributes, toOverride);
                    }
                });
            }

            response.success(realItemsList);
        })
        .catch((err) => {
            response.error("Couldn't get information for home page.");
        });
});

Parse.Cloud.define("FoodPage", (request, response) => {
    let tableToObjectIds = {};
    let fieldsToOverride = {};

    //  Getting all items from Food class.
    const query = new Parse.Query("Food");

    //  Trying to include relations.
    query.include("restaurants");
    query.include("tags");
    query.include("subtitle");

    //  Querying only one item from Food class.
    query.equalTo("objectId", "HZzRmf3HXg");

    //  Executing the query.
    query.find()
        .then((results) => {
            response.success(results);
        })
        .catch((err) => {
            response.error("Couldn't get information for home page.");
        });
});