CREATE TABLE `updated` (
    `id`            INT     PRIMARY KEY,
    `iso8601`       TEXT    NOT NULL
);

CREATE TABLE `modules` (
    `name`          TEXT    PRIMARY KEY,

    `description`   TEXT,
    `url`           TEXT,
    `version`       TEXT,
    `keywords`      TEXT,
    `time`          TEXT
);

CREATE TABLE `words` (
    `word`          TEXT,
    `module_name`   TEXT
);

CREATE INDEX `word_idx` ON `words`(`word`, `module_name`);
