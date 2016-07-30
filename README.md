# npm-search-sqlite

this a a proof-of-concept showing how sqlite might be employed to tackle the broken `npm search` command.

## motivation ...

1. `npm search` has been broken for a very long time ([see here](https://github.com/npm/npm/issues/6016))
2. `npm search` is worth having ([dropping of support is being considered in npm v4](https://github.com/npm/npm/issues/11035))
3. `npm search` that works, when the internet does not, is worth having (making `npm search` rely on the remote search API is being considered)

## pre-requisites ...

you need to have `npm` installed (in addition to running it, your `~/.npm/` dir needs to exist)

you need a local copy of the `npm` JSON cache file, stored in the place `npm` puts it,
you might not have it, if not run the following:

```sh
curl -s https://registry.npmjs.org/-/all > ~/.npm/registry.npmjs.org/-/all/.cache.json
```

## trying it out ...

```sh
git clone https://github.com/iamjochem/npm-search-sqlite
cd npm-search-sqlite
npm run build
```

at this point you probably want to go and walk the dog, make a cup of tea - the `npm run build` creates a sqlite and takes about **15 minutes** (my machine is a 2,6 GHz Intel Core i5 MacBookPro with 8GB of RAM and an SSD, YMMV).

once it's complete you can try a search out (`npm run search <SEARCH TERMS>`), e.g.:

```sh
npm run search moment datetime
```

## caveats ...

1. I know SQL but my knowledge of SQLite is non-existent - in this regard the "build" code is probably inefficient.
2. My understanding of "streams" is a bit limited - in this regard the "build" code is probably "wrong".
3. The search-results output generated is only a vague approximation of the nicely formatted `npm` itself outputs.
4. The query/logic used for search is an approximation of the actual `npm search` logic, the `npm` config settings `searchopts` & `searchexclude` are not considered. 
5. the SQLite file being created is around 50% larger (300MB+-) than the source JSON file.

## thoughts ...

- The building of the SQLite database (with 330000+- modules in the registry) takes a long time, not something you want to rebuild in full everytime the JSON cache is updated - the SQLite database could be built centrally periodically and downloaded by the `npm` client, alternatively a local SQLite database could be updated incrementally (databases are good like that :-))
- Having the search based on an SQLite database opens up possibilities for more advanced/complex search functionality.
- The `npm` registry *seems* to contain alot of junk modules, I wonder what can reasonably be done about it?
- The `npm` JSON cache file seems to contain module entries that npm does not think exist (e.g. the cache file I downloaded on 29-07-2016 contains a module entry "zzzzzzzzzzzzzzzzzzz" that `npm info` says is not in the registry) ... this might just be a timing issue.
