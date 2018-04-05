'use strict';

module.exports = fixResults;

const fixedKey = 'ari-query-result-fixed';

function isFixed(item) {
    return item.hasOwnProperty(fixedKey);
}

function setFixed(item) {
    if (!isFixed(item)) {
        Object.defineProperty(item, fixedKey, {
            value: 1
        });
    }
    return item;
}

function fix(item) {
    const result = item._toFullJSON(['HACK']);
    setFixed(result);

    return result;
}

function fixResults(results) {
    return results.map((item) => {
        return isFixed(item) ? item : fix(item);
    });
}