CREATE TABLE IF NOT EXISTS presence_visitors (
  day TEXT NOT NULL, visitor_id TEXT NOT NULL, last_seen INTEGER NOT NULL,
  PRIMARY KEY(day, visitor_id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS presence_recent ON presence_visitors(last_seen);
CREATE TABLE IF NOT EXISTS presence_daily (day TEXT PRIMARY KEY, visitors INTEGER NOT NULL DEFAULT 0) WITHOUT ROWID;
CREATE TRIGGER IF NOT EXISTS presence_new_visitor AFTER INSERT ON presence_visitors
BEGIN
  INSERT INTO presence_daily(day, visitors) VALUES(NEW.day, 1)
    ON CONFLICT(day) DO UPDATE SET visitors=visitors+1;
END;
