'use strict';

module.exports = fixResults;

const fixedKey = 'ari-query-result-fixed';

function isFixed(item) {
    return item.hasOwnProperty(fixedKey);
}

function setFixed(item) {
    Object.defineProperty(item, fixedKey, {
        value: 1
    });
    return item;
}

function fix(item) {
    return setFixed(item._toFullJSON(['HACK']));
}

function fixResults(results) {
    return results.map((item) => {
        if (!isFixed(item)) {
            item = fix(item);
        }
        return item;
    });
}