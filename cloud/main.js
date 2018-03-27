Parse.Cloud.define("HomePage", function(request, response) {
    let tableToObjectIds = {};
    let fieldsToOverride = {};

    //  Getting all fields from Home class.
    const query = new Parse.Query("Home");

    //  Executing the query.
    query.find();
/*
        .then((results) => {
            let promises = [];
            //  Preparing results.
            results.forEach((item) => {
                const refObjectId = item.get('refObjectId');
                const info = refObjectId.split(':');

                if (info.length != 2) {
                    continue;
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
                const objectIds = table2ObjectIds[table];
                const query = new Parse.Query(table);

                //  Getting only needed items from this table.
                query.containedIn("objectId", objectIds);

                //  Sending the request and saving the promise in promises array.
                promises.push(query.find());
            }

            return Parse.Promise.all(promises);
        })*/
        .then((realItemsList) => {
            let i = 0;
/*            for (const table in tableToObjectIds) {
                const items = realItemsList[i++];

                items.forEach((item) => {
                    const refObjectId = table + ':' + item.get('objectId');
                    const fields = item.attributes;

                    const toOverride = fieldsToOverride[refObjectId];
                    if (toOverride) {
                        Object.assign(item.attributes, toOverride);
                    }
                });
            }*/

            response.success('SUCCESS MESSAGE');
        })
        .catch(() => {
            response.error("Couldn't get information for home page.");
        });
});