var path        = require('path');
var fs          = require('fs');

var bb          = require('bluebird');
var sqlite3     = require('sqlite3')/*.verbose()*/;
var repeat      = require('lodash.repeat');
var padright    = require('lodash.padend');
var padleft     = require('lodash.padstart');
var truncate    = require('lodash.truncate');

var existsP     = bb.promisify(fs.stat);

var sqlite_file = require('./files').sqlite;
var max_rows    = 42;

var suicide     = function(err) {
    console.error(err);
    process.exit(1);
};

var chk_file    = function() {
    return existsP(sqlite_file).error(function(err) {
        throw new Error('"' + sqlite_file + '" does not exist - run `npm run build` before trying a search!');
    });
};

var get_db      = function() {
    return new bb(function(resolve, reject) {
        var db;

        db = new sqlite3.Database(sqlite_file);

        db.on('error', reject);

        db.on('open', function() {
            db.serialize(); //
            resolve(db);
        });
    });
};

var do_search   = function(db) {
    if (process.argv.length < 3)
        throw new Error('no search terms given!');

    return new bb(function(resolve, reject) {
        var args     = process.argv.slice(2).map(function(s) { return s.toLowerCase(); });

        var find_sql = "SELECT      COUNT(*) AS `cnt`, `module_name`" +
                       "FROM        `words` " +
                       "WHERE       `word` IN (" + repeat('?', args.length).split('').join(',') + ") " +
                       "GROUP BY    `module_name` " +
                       "ORDER BY    `cnt` DESC " +
                       "LIMIT " + max_rows;

        db.all(find_sql, args, function(err, cnts) {
            if (err)
                return reject(err);

            var names   = cnts.map(function(row) { return row.module_name; }).concat(args);
            var mod_sql = 'SELECT * FROM `modules` WHERE `name` IN (' + repeat('?', names.length).split('').join(',') + ')';

            db.all(mod_sql, names, function(err, mods) {
                var exacts, results, mod_len;

                if (err)
                    return reject(err);

                exacts  = [];
                results = [];
                mod_len = mods.length;

                mods.forEach(function(mod) {
                    if (args.indexOf(mod.name) !== -1)
                        exacts.push(mod);
                });

                cnts.forEach(function(cnt) {
                    var i = 0, mname = cnt.module_name;

                    if (args.indexOf(mname) !== -1)
                        return;

                    for (; i < mod_len; i += 1) if (mods[i].name === mname) {
                        results.push(mods[i]);
                        break;
                    }
                });

                resolve(exacts.concat(results).slice(0, max_rows));
            })
        });
    });
};

var show_finds  = function(rows) {
    var longest;

    if (!rows || !rows.length)
        return console.log('No matches, :-(');

    console.log('Matches found: %s', rows.length === max_rows ? '(' + max_rows + ' rows shown, there may be more results)' : '');
    console.log('---------------------------------------------------------');

    rows = rows.map(function(row, idx) {
        return {
            num : idx + 1,
            name: [row.name, row.version].join('@'),
            desc: truncate(row.description, { length : 128, omission : ' ...' }),
        };
    })

    longest = rows.reduce(function(prev, row) {
        return (row.name.length > prev) ? row.name.length : prev;
    }, 0);

    rows.forEach(function(row) {
        console.log('%s. %s - %s', padleft(row.num, 2, ' '), padright(row.name, longest + 1, ' '), row.desc);
    });

    console.log('');
};

chk_file()
    .then(get_db)
    .then(do_search)
    .then(show_finds)
    .catch(suicide)
    ;


//