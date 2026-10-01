import os
from pathlib import Path

import psycopg2
import psycopg2.extras

BASE_DIR = Path(__file__).resolve().parent
SCHEMA_PATH = BASE_DIR / 'schema.sql'


def get_local_connection():
    return psycopg2.connect(
        host=os.environ['DB_HOST'],
        port=os.environ.get('DB_PORT', 5432),
        dbname=os.environ['DB_NAME'],
        user=os.environ['DB_USER'],
        password=os.environ['DB_PW'],
    )


def init_db(conn):
    with conn.cursor() as cur:
        cur.execute(SCHEMA_PATH.read_text())
    conn.commit()


def dict_cursor(conn):
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


def get_live_events(conn):
    with dict_cursor(conn) as cur:
        cur.execute("""
            SELECT event_date, event_time, server, service_level, tag,
                   account, groep, alias, reden, owner
            FROM sslogger_live
            WHERE event_date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY event_date DESC, event_time DESC
        """)
        rows = cur.fetchall()

    return [{
        'Datum': row['event_date'].strftime('%d-%m-%Y'),
        'Tijd': row['event_time'].strftime('%H:%M:%S'),
        'Server': row['server'],
        'SL': row['service_level'],
        'Tag': row['tag'],
        'User': row['account'],
        'Groep': row['groep'],
        'Alias': row['alias'],
        'Reden': row['reden'],
        'Owner': row['owner'],
    } for row in rows]


def get_report_events(conn, year_month):
    start = f'{year_month[:4]}-{year_month[4:6]}-01'
    with dict_cursor(conn) as cur:
        cur.execute("""
            SELECT event_date, event_time, server, service_level, tag,
                   account, groep, alias, reden, owner
            FROM sslogger_live
            WHERE event_date >= %(start)s
              AND event_date < (%(start)s::date + INTERVAL '1 month')
            ORDER BY event_date, event_time
        """, {'start': start})
        rows = cur.fetchall()

    return [{
        'Datum': row['event_date'].strftime('%d-%m-%Y'),
        'Tijdstip': row['event_time'].strftime('%H:%M:%S'),
        'Server': row['server'],
        'SL': row['service_level'],
        'Account': row['account'],
        'Groep': row['groep'],
        'Reden': row['reden'],
        'Owner': row['owner'],
    } for row in rows]
