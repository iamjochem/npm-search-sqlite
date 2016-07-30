var path        = require('path');
var fs          = require('fs');

var bb          = require('bluebird');
var sqlite3     = require('sqlite3')/*.verbose()*/;
var moment      = require('moment');
var after       = require('lodash.after');

var mkdirP      = bb.promisify(require('mkdirp'));
var existsP     = bb.promisify(fs.stat);
var rmP         = bb.promisify(require('rimraf'));

var helpers     = require('./build-helpers');

var json_file   = require('./files').json;
var sqlite_file = require('./files').sqlite;

var parser      = require('JSONStream').parse('$*'); // emitKey = true !

// number of modules parsed from input JSON
var mod_count   = 0;

var suicide     = function(err) {
    console.error(err);
    process.exit(1);
};

var chk_src     = function() {
    return existsP(json_file).error(function(err) {
        throw new Error('"' + json_file + '" does not exist - get a copy of the NPM cache (e.g. `curl -s https://registry.npmjs.org/-/all > ~/.npm/registry.npmjs.org/-/all/.cache.json`)');
    });
};

var mk_bld_dir  = function() {
    return mkdirP(path.dirname(sqlite_file));
};

var rm_sql_file = function() {
    return existsP(sqlite_file)
        .then (function(stat) { return rmP(sqlite_file + '*'); })
        .then (function() { console.log('Deleted existing SQLite database (%s)', sqlite_file); })
        .catch(function() { /* not existing, not a problem */ })
        ;
};

var get_db      = function() {
    return new bb(function(resolve, reject) {
        var db;

        var ddl_file = path.join(__dirname, 'ddl.sql');
        var ddl_sql  = fs.readFileSync(ddl_file, 'utf8');

        if (typeof ddl_sql !== 'string' || !ddl_sql.length)
            return reject(new Error('SQLite DDL file (%s) does not contain required schema SQL statements!', ddl_file));

        db = new sqlite3.Database(sqlite_file);

        db.on('error', reject);

        db.on('open', function() {
            db.serialize();
            db.exec(ddl_sql, function(err) {
                if (err)
                    return reject(err);

                // TODO: figure out if this make shit faster
                db.run('PRAGMA journal_mode=WAL;', function(err) {
                    if (err)
                        return reject(err);

                    resolve(db);
                });

            });
        });
    });
};

var run         = function(db) {
    return new bb(function(resolve, reject) {
        var instream = fs.createReadStream(json_file);

        console.log('Attempting to parse %s into %s', json_file, sqlite_file);

        instream.pipe(parser);

        parser.on('data', function(data) {
            var name, mod, keywords = null;

            if (data.key === '_updated')
                return db.run('INSERT INTO `updated` (`iso8601`) VALUES (?)', moment(data.value).toISOString());

            name = data.value.name;

            // is this an error? I am not privy to the exact data format of the NPMJS registry JSON cache files ... no idea what else could be stored in there
            if (!name)
               return;

            // the following probably shows I don't understand streams fully
            instream.unpipe(parser);
            instream.pause();
            parser.pause();

            mod  = helpers.getWords(helpers.stripData(data.value));

            if (mod.keywords) {
                if (typeof mod.keywords === 'string')
                    keywords = mod.keywords;
                else if (mod.keywords.length && typeof mod.keywords.join === 'function')
                    keywords = mod.keywords.join(',');
            }

            db.run('BEGIN TRANSACTION');
            db.run(
                'INSERT INTO `modules` (`name`, `description`, `url`, `version`, `keywords`, `time`) VALUES (?, ?, ?, ?, ?, ?)',
                mod.name,
                mod.description,
                mod.url,
                mod.version && (typeof mod.version === 'string') ? mod.version : null,
                keywords,
                mod.time
            );

            mod.words.split(' ').forEach(function(w) {
                db.run('INSERT INTO `words` (`word`, `module_name`) VALUES (?, ?)', w, name);
            });

            db.run('COMMIT', function(err) {
                if (err)
                    return reject(err);

                console.log('Module #%d: %s has been parsed.', (mod_count += 1), data.value.name);

/*
                if (mod_count >= 100) {
                    console.log('early death for debuggin\' ..!');

                    instream.close();
                    parser.removeAllListeners('data');
                    parser.removeAllListeners('error');
                    parser.removeAllListeners('end');

                    return resolve();
                }
//*/

                instream.pipe(parser);
                instream.resume();
                parser.resume();
            });
        });

        parser.on('error',  reject);
        parser.on('end',    resolve);
    });
}

var results     = function(db) {
    var totals  = {
        modules : 0,
        words   : 0,
        dwords  : 0,
    };

    return new bb(function(resolve, reject) {
        var done = after(3, function() {

            console.log('%d modules parsed from JSON',          mod_count);
            console.log('%d modules inserted into DB',          totals.modules);
            console.log('%d words inserted into DB',            totals.words);
            console.log('%d distinct words inserted into DB',   totals.dwords);

            resolve();
        });

        db.each('SELECT COUNT(*) AS `cnt` FROM `modules`', function(err, row) {
            if (err)
                return reject(err);

            totals.modules = row.cnt;
            done();
        });

        db.each('SELECT COUNT(*) AS `cnt` FROM `words`', function(err, row) {
            if (err)
                return reject(err);

            totals.words = row.cnt;
            done();
        });

        db.each('SELECT COUNT(DISTINCT `word`) AS `cnt` FROM `words`', function(err, row) {
            if (err)
                return reject(err);

            totals.dwords = row.cnt;
            done();
        });
    });
};

var end         = function(db) {
    return new bb(function(resolve, reject) {
        db.close(function(err) {
            if (err)
                console.err(err);

            console.log('... That\'s All Folks.');

            resolve();
        });
    });
};

chk_src()
    .then(mk_bld_dir)
    .then(rm_sql_file)
    .then(get_db)
    .tap(run)
    .tap(results)
    .tap(end)
    .catch(suicide)
    ;
