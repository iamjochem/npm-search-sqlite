/**
 * alot of the code in this file is copied from `npm` itself, purely so we can show-case a npm-search functionality
 * with sqlite ... in a real implementation the DB building and DB search logic will be integrated in the actual
 * `npm` project and the original code can be used :-)
 */

var EventEmitter = require('events').EventEmitter;

/**
 * a mock `npm.js` instance - to satisfy the copied code below ...
 *
 * @type {EventEmitter}
 */
var npm          = new EventEmitter();

npm.config = {
    loaded  : true,
    get     : function (k) {
        switch (k) {
            case 'description': return true;
        }

        return;
    },

    set     : function () { /* do nothing */ }
}

module.exports  = {
    // copied from https://github.com/npm/npm/blob/master/lib/search.js#L100
    stripData   : function stripData(data) {
        return {
            name        : data.name,
            description : npm.config.get('description') ? data.description : '',
            maintainers : (data.maintainers || []).map(function (m) { return '    =' + m.name }),
            url         : !Object.keys(data.versions || {}).length ? data.url : null,
            keywords    : data.keywords || [],
            version     : Object.keys(data.versions || {})[0] || [],
            time        : data.time && data.time.modified &&
                (new Date(data.time.modified).toISOString()
                .split('T').join(' ').replace(/:[0-9]{2}\.[0-9]{3}Z$/, ''))
                .slice(0, -5) || 'prehistoric'
        }
    },

    // copied from https://github.com/npm/npm/blob/master/lib/search.js#L120
    getWords    : function getWords(data) {
        data.words = [ data.name ]
                   .concat(data.description)
                   .concat(data.maintainers)
                   .concat(data.url && ('<' + data.url + '>'))
                   .concat(data.keywords)
                   .map(function (f) { return f && f.trim && f.trim() })
                   .filter(function (f) { return f })
                   .join(' ')
                   .toLowerCase()
        return data
    },
};