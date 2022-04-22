-- Create syntax for TABLE 'bookchanges'
CREATE TABLE "bookchanges" (
  "id" int unsigned NOT NULL AUTO_INCREMENT,
  "ledger" int NOT NULL,
  "close" double NOT NULL,
  "cur_a" varchar(100) NOT NULL,
  "cur_b" varchar(100) NOT NULL,
  "high" double NOT NULL,
  "low" double NOT NULL,
  "open" double NOT NULL,
  "vol_a" double NOT NULL,
  "vol_b" double NOT NULL,
  PRIMARY KEY ("id"),
  KEY "cur_a" ("cur_a"),
  KEY "cur_b" ("cur_b"),
  KEY "ledger" ("ledger"),
  KEY "close" ("close"),
  KEY "high" ("high"),
  KEY "low" ("low"),
  KEY "open" ("open"),
  KEY "vol_a" ("vol_a"),
  KEY "vol_b" ("vol_b")
);

-- Create syntax for TABLE 'ledgers'
CREATE TABLE "ledgers" (
  "id" int unsigned NOT NULL AUTO_INCREMENT,
  "ledger" int NOT NULL,
  "closed" datetime DEFAULT NULL,
  "bookchanges" int DEFAULT NULL,
  PRIMARY KEY ("id"),
  UNIQUE KEY "ledger" ("ledger"),
  KEY "closed" ("closed"),
  KEY "bookchanges" ("bookchanges")
);

