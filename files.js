var path        = require('path');

module.exports  = {
    json        : path.join(process.env.HOME, '.npm/registry.npmjs.org/-/all/.cache.json'),
    sqlite      : path.join(__dirname, 'build/all-cache.sqlite'),
};