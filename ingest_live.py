#!/usr/bin/env python3
import os
import re
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values

from db import get_local_connection, init_db

BASE_DIR = Path(__file__).resolve().parent
PROD_OWNER_PATH = BASE_DIR / 'data' / 'prod_owner.txt'
ACCOUNTS_PATH = BASE_DIR / 'data' / 'accounts.txt'

SOURCE_QUERY = """
    SELECT devicereportedtime, syslogtag, fromhost, message
    FROM systemevents
    WHERE (syslogtag = 'sslogger' OR syslogtag = 'sslogger:')
      AND message ~ 'as:root'
    ORDER BY devicereportedtime DESC
"""

UPSERT_QUERY = """
    INSERT INTO sslogger_live
        (event_date, event_time, server, service_level, tag, account, groep, alias, reden, owner)
    VALUES %s
    ON CONFLICT (event_date, event_time, server, account) DO NOTHING
"""


def read_lines(path):
    return [line for line in path.read_text().splitlines() if line]


def find_prod_entry(prodlist, fromhost):
    for entry in prodlist:
        if entry.startswith(fromhost):
            return entry
    return None


def find_group(accounts, account):
    for entry in accounts:
        if account in entry:
            parts = entry.split('\t')
            if len(parts) > 1:
                return parts[1]
    return 'onbekend'


def parse_message(message):
    parts = message.split('; ')
    account = parts[0].split(':')[1]
    alias = re.sub(r'^\s', '', parts[1]) if len(parts) > 1 else ''
    reden = re.sub(r'^\s|,|"|;', '', parts[-1]) if parts else ''
    return account, alias, reden


def fetch_source_rows():
    conn = psycopg2.connect(
        host=os.environ['SRC_DB_HOST'],
        port=os.environ.get('SRC_DB_PORT', 5432),
        dbname=os.environ['SRC_DB_NAME'],
        user=os.environ['SRC_DB_USER'],
        password=os.environ['SRC_DB_PW'],
    )
    try:
        with conn.cursor() as cur:
            cur.execute(SOURCE_QUERY)
            return cur.fetchall()
    finally:
        conn.close()


def build_rows(source_rows, prodlist, accounts):
    rows = []
    for reported_time, tag, fromhost, message in source_rows:
        entry = find_prod_entry(prodlist, fromhost)
        if not entry:
            continue

        entry_fields = entry.split(',')
        if len(entry_fields) < 3:
            continue
        service_level, owner = entry_fields[1], entry_fields[2]

        try:
            account, alias, reden = parse_message(message)
        except IndexError:
            continue

        groep = find_group(accounts, account)

        rows.append((
            reported_time.date(),
            reported_time.time(),
            fromhost,
            service_level,
            tag,
            account,
            groep,
            alias,
            reden,
            owner,
        ))
    return rows


def main():
    prodlist = read_lines(PROD_OWNER_PATH)
    accounts = read_lines(ACCOUNTS_PATH)

    source_rows = fetch_source_rows()
    rows = build_rows(source_rows, prodlist, accounts)

    conn = get_local_connection()
    try:
        init_db(conn)
        if rows:
            with conn.cursor() as cur:
                execute_values(cur, UPSERT_QUERY, rows)
            conn.commit()
    finally:
        conn.close()


if __name__ == '__main__':
    main()
